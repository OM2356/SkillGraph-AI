import firebaseConfig from '../../firebase-applet-config.json' with { type: 'json' };
import { AppError } from '../middleware/errorHandler.ts';

const PROJECT_ID = firebaseConfig.projectId;
const DATABASE_ID = firebaseConfig.firestoreDatabaseId || '(default)';
const BASE_URL = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/${DATABASE_ID}/documents`;

type FirestoreValue =
  | { stringValue: string }
  | { integerValue: string }
  | { doubleValue: number }
  | { booleanValue: boolean }
  | { timestampValue: string }
  | { nullValue: null }
  | { arrayValue: { values?: FirestoreValue[] } }
  | { mapValue: { fields?: Record<string, FirestoreValue> } };

interface FirestoreDocument {
  name: string;
  fields?: Record<string, FirestoreValue>;
  createTime?: string;
  updateTime?: string;
}

function toFirestoreValue(val: unknown): FirestoreValue {
  if (val === null || val === undefined) return { nullValue: null };
  if (typeof val === 'string') return { stringValue: val };
  if (typeof val === 'boolean') return { booleanValue: val };
  if (typeof val === 'number') {
    return Number.isInteger(val) ? { integerValue: String(val) } : { doubleValue: val };
  }
  if (val instanceof Date) return { timestampValue: val.toISOString() };
  if (Array.isArray(val)) {
    return { arrayValue: { values: val.map((item) => toFirestoreValue(item)) } };
  }
  if (typeof val === 'object') {
    const fields: Record<string, FirestoreValue> = {};
    for (const [k, v] of Object.entries(val as Record<string, unknown>)) {
      if (v !== undefined) {
        fields[k] = toFirestoreValue(v);
      }
    }
    return { mapValue: { fields } };
  }
  return { stringValue: String(val) };
}

function fromFirestoreValue(val: FirestoreValue): unknown {
  if ('stringValue' in val) return val.stringValue;
  if ('integerValue' in val) return Number(val.integerValue);
  if ('doubleValue' in val) return Number(val.doubleValue);
  if ('booleanValue' in val) return val.booleanValue;
  if ('timestampValue' in val) return val.timestampValue;
  if ('nullValue' in val) return null;
  if ('arrayValue' in val) return (val.arrayValue.values || []).map(fromFirestoreValue);
  if ('mapValue' in val) {
    const obj: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(val.mapValue.fields || {})) {
      obj[k] = fromFirestoreValue(v);
    }
    return obj;
  }
  return null;
}

function decodeDocument(doc: FirestoreDocument): Record<string, unknown> {
  const obj: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(doc.fields || {})) {
    obj[k] = fromFirestoreValue(v);
  }
  return obj;
}

function encodeFields(data: Record<string, unknown>): Record<string, FirestoreValue> {
  const fields: Record<string, FirestoreValue> = {};
  for (const [k, v] of Object.entries(data)) {
    if (v !== undefined) {
      fields[k] = toFirestoreValue(v);
    }
  }
  return fields;
}

export async function fsGetDoc(
  docPath: string,
  bearerToken: string
): Promise<Record<string, unknown> | null> {
  const res = await fetch(`${BASE_URL}/${docPath}`, {
    headers: { Authorization: `Bearer ${bearerToken}` },
  });
  if (res.status === 404) return null;
  if (!res.ok) {
    const text = await res.text();
    throw new AppError(res.status, `Firestore read failed: ${text}`, 'FIRESTORE_ERROR');
  }
  const doc = (await res.json()) as FirestoreDocument;
  return decodeDocument(doc);
}

export async function fsListCollection(
  colPath: string,
  bearerToken: string
): Promise<Array<Record<string, unknown>>> {
  const res = await fetch(`${BASE_URL}/${colPath}?pageSize=200`, {
    headers: { Authorization: `Bearer ${bearerToken}` },
  });
  if (res.status === 404) return [];
  if (!res.ok) {
    const text = await res.text();
    throw new AppError(res.status, `Firestore list failed: ${text}`, 'FIRESTORE_ERROR');
  }
  const payload = (await res.json()) as { documents?: FirestoreDocument[] };
  return (payload.documents || []).map(decodeDocument);
}

export async function fsCommitWrite(
  docPath: string,
  data: Record<string, unknown>,
  bearerToken: string,
  options: { isCreate?: boolean; serverTimestampFields?: string[] } = {}
): Promise<Record<string, unknown>> {
  const fullDocName = `projects/${PROJECT_ID}/databases/${DATABASE_ID}/documents/${docPath}`;
  const serverFields = options.serverTimestampFields || ['updatedAt'];

  const cleanData = { ...data };
  for (const sf of serverFields) {
    delete cleanData[sf];
  }

  const fieldTransforms = serverFields.map((fieldPath) => ({
    fieldPath,
    setToServerValue: 'REQUEST_TIME',
  }));

  const writes: Array<Record<string, unknown>> = [
    {
      update: {
        name: fullDocName,
        fields: encodeFields(cleanData),
      },
      ...(options.isCreate ? { currentDocument: { exists: false } } : {}),
      updateTransforms: fieldTransforms,
    },
  ];

  const res = await fetch(
    `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/${DATABASE_ID}/documents:commit`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${bearerToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ writes }),
    }
  );

  if (!res.ok) {
    const text = await res.text();
    throw new AppError(res.status, `Firestore write failed: ${text}`, 'FIRESTORE_WRITE_ERROR');
  }

  const saved = await fsGetDoc(docPath, bearerToken);
  return saved || data;
}

export async function fsPatchFields(
  docPath: string,
  updates: Record<string, unknown>,
  bearerToken: string,
  withUpdatedAt = true
): Promise<Record<string, unknown>> {
  const fullDocName = `projects/${PROJECT_ID}/databases/${DATABASE_ID}/documents/${docPath}`;
  const cleanUpdates = { ...updates };
  delete cleanUpdates.updatedAt;

  const updateMaskPaths = Object.keys(cleanUpdates);
  const fieldTransforms = withUpdatedAt
    ? [{ fieldPath: 'updatedAt', setToServerValue: 'REQUEST_TIME' }]
    : [];

  const writes = [
    {
      update: {
        name: fullDocName,
        fields: encodeFields(cleanUpdates),
      },
      updateMask: { fieldPaths: updateMaskPaths },
      currentDocument: { exists: true },
      ...(fieldTransforms.length > 0 ? { updateTransforms: fieldTransforms } : {}),
    },
  ];

  const res = await fetch(
    `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/${DATABASE_ID}/documents:commit`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${bearerToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ writes }),
    }
  );

  if (!res.ok) {
    const text = await res.text();
    throw new AppError(res.status, `Firestore update failed: ${text}`, 'FIRESTORE_UPDATE_ERROR');
  }

  const saved = await fsGetDoc(docPath, bearerToken);
  return saved || updates;
}

export async function fsDeleteDoc(docPath: string, bearerToken: string): Promise<void> {
  const res = await fetch(`${BASE_URL}/${docPath}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${bearerToken}` },
  });
  if (!res.ok && res.status !== 404) {
    const text = await res.text();
    throw new AppError(res.status, `Firestore delete failed: ${text}`, 'FIRESTORE_DELETE_ERROR');
  }
}

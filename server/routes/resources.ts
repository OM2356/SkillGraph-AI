import express from 'express';
import { LEARNING_RESOURCES, PROJECT_TEMPLATES } from '../../src/shared/catalogData.ts';

export const resourcesRouter = express.Router();

resourcesRouter.get('/resources', (req, res) => {
  const skill = typeof req.query.skill === 'string' ? req.query.skill.toLowerCase() : '';
  const freeOnly = req.query.freeOnly === 'true';

  const items = LEARNING_RESOURCES.filter((r) => {
    if (freeOnly && !r.isFree) return false;
    if (skill && !r.skill.toLowerCase().includes(skill)) return false;
    return true;
  });
  res.json({ count: items.length, resources: items });
});

resourcesRouter.get('/projects/templates', (req, res) => {
  const roleId = typeof req.query.roleId === 'string' ? req.query.roleId : '';
  const difficulty = typeof req.query.difficulty === 'string' ? req.query.difficulty : '';
  const templates = PROJECT_TEMPLATES.filter((t) => {
    if (roleId && !t.roleIds.includes(roleId)) return false;
    if (difficulty && difficulty !== 'All' && t.difficulty !== difficulty) return false;
    return true;
  });
  res.json({ count: templates.length, templates });
});

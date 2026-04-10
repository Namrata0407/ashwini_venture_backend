const Task = require('../models/Task');
const { TASK_STATUSES } = require('../models/Task');
const { emitToUser } = require('../sockets');

function escapeRegex(str) {
  return String(str).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

async function list(req, res, next) {
  try {
    const query = { owner: req.user.id };

    const { status, search } = req.query;
    if (status && TASK_STATUSES.includes(status)) {
      query.status = status;
    }
    if (search && String(search).trim()) {
      const regex = new RegExp(escapeRegex(String(search).trim()), 'i');
      query.$or = [{ title: regex }, { description: regex }];
    }

    const tasks = await Task.find(query)
      .sort({ status: 1, order: 1, createdAt: -1 })
      .lean();

    res.json({ tasks });
  } catch (err) {
    next(err);
  }
}

async function create(req, res, next) {
  try {
    const { title, description, status, order } = req.body || {};
    if (!title || !String(title).trim()) {
      return res.status(400).json({ error: 'title is required' });
    }
    if (status && !TASK_STATUSES.includes(status)) {
      return res.status(400).json({ error: 'invalid status' });
    }

    const task = await Task.create({
      title: String(title).trim(),
      description: description || '',
      status: status || 'todo',
      order: typeof order === 'number' ? order : 0,
      owner: req.user.id,
    });

    emitToUser(req.user.id, 'task:created', task.toObject());
    res.status(201).json(task);
  } catch (err) {
    next(err);
  }
}

async function update(req, res, next) {
  try {
    const { id } = req.params;
    const { clientUpdatedAt, title, description, status, order } = req.body || {};

    if (status && !TASK_STATUSES.includes(status)) {
      return res.status(400).json({ error: 'invalid status' });
    }

    const existing = await Task.findOne({ _id: id, owner: req.user.id });
    if (!existing) {
      return res.status(404).json({ error: 'Task not found' });
    }

    if (clientUpdatedAt) {
      const clientTs = new Date(clientUpdatedAt).getTime();
      const serverTs = existing.updatedAt.getTime();
      if (Number.isFinite(clientTs) && clientTs < serverTs) {
        return res.status(409).json({
          code: 'STALE_UPDATE',
          error: 'Task was modified by another client',
          current: existing.toObject(),
        });
      }
    }

    if (title !== undefined) existing.title = String(title).trim();
    if (description !== undefined) existing.description = description;
    if (status !== undefined) existing.status = status;
    if (order !== undefined) existing.order = order;

    await existing.save();

    emitToUser(req.user.id, 'task:updated', existing.toObject());
    res.json(existing);
  } catch (err) {
    next(err);
  }
}

async function remove(req, res, next) {
  try {
    const { id } = req.params;
    const deleted = await Task.findOneAndDelete({ _id: id, owner: req.user.id });
    if (!deleted) {
      return res.status(404).json({ error: 'Task not found' });
    }
    emitToUser(req.user.id, 'task:deleted', { id });
    res.status(204).end();
  } catch (err) {
    next(err);
  }
}

module.exports = { list, create, update, remove };

const mongoose = require('mongoose');

const TASK_STATUSES = ['todo', 'in-progress', 'done'];

const TaskSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      default: '',
    },
    status: {
      type: String,
      enum: TASK_STATUSES,
      default: 'todo',
      index: true,
    },
    order: {
      type: Number,
      default: 0,
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
  },
  { timestamps: true }
);

TaskSchema.index({ owner: 1, status: 1 });

const Task = mongoose.model('Task', TaskSchema);

module.exports = Task;
module.exports.TASK_STATUSES = TASK_STATUSES;

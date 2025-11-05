var Task = require('../models/task.js');
var User = require('../models/user.js');  
var mongoose = require('mongoose');

module.exports = function(router) {
    const tasksRoute = router.route('/tasks');

    // GET /api/tasks
    tasksRoute.get(async (req, res) => {
        try {
            let where = {};
            if (req.query.where) {
                try {
                    where = JSON.parse(req.query.where);
                } catch (e) {
                    return res.status(400).json({ message: "is not valid JSON", data: e.message });
                }
            }

            if (req.query.count === 'true') {
                const count = await Task.countDocuments(where);
                return res.status(200).json({
                    message: "task count successfully",
                    data: count
                });
            }
 
            let query = Task.find(where);
            if (req.query.sort) {
                try {
                    query = query.sort(JSON.parse(req.query.sort));
                } catch (e) {
                    return res.status(400).json({ message: "sort is not valid", data: e.message });
                }
            }

            if (req.query.select) {
                try {
                    query = query.select(JSON.parse(req.query.select));
                } catch (e) {
                    return res.status(400).json({ message: "select is not valid", data: e.message });
                }
            }

            if (req.query.skip) {
                query = query.skip(parseInt(req.query.skip));
            }

            // limit 100
            const limit = req.query.limit ? parseInt(req.query.limit) : 100;
            query = query.limit(limit);

            const tasks = await query.exec();
            res.status(200).json({
                message: "task list retrieved successfully",
                data: tasks
            });

        } catch (error) {
            res.status(500).json({
                message: "server error",
                data: error.message
            });
        }
    });
  
    tasksRoute.post(async (req, res) => {
        try {
            const newTask = new Task(req.body);
            await newTask.save();

            res.status(201).json({  
                message: "task created",
                data: newTask
            });

        } catch (error) {
            if (error.name === 'ValidationError') {
                return res.status(400).json({ message: "Validation error", data: error.message });
            }
            res.status(500).json({
                message: "server error",
                data: error.message
            });
        }
    });
    const tasksIdRoute = router.route('/tasks/:id');

    tasksIdRoute.get(async (req, res) => {
        try {
            if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
                return res.status(400).json({ message: "invalid task ID format", data: null });
            }

            let query = Task.findById(req.params.id);

            if (req.query.select) {
                try {
                    query = query.select(JSON.parse(req.query.select));
                } catch (e) {
                    return res.status(400).json({ message: "select is not valid ", data: e.message });
                }
            }

            const task = await query.exec();

            if (!task) {
                return res.status(404).json({
                    message: "task not found",
                    data: null
                });
            }

            res.status(200).json({
                message: "task retrieved successfully",
                data: task
            });

        } catch (error) {
            res.status(500).json({
                message: "Server error",
                data: error.message
            });
        }
    });

 
    tasksIdRoute.put(async (req, res) => {
        try {
            const { name, deadline } = req.body;
            if (!name || !deadline) {
                return res.status(400).json({ message: "name and deadline are required for update", data: null });
            }
            const oldTask = await Task.findById(req.params.id);
            if (!oldTask) {
                return res.status(404).json({ message: "Task not found", data: null });
            }
            const oldUserId = oldTask.assignedUser;

            const updatedTask = await Task.findByIdAndUpdate(
                req.params.id,
                req.body,
                { new: true, runValidators: true }
            );

            const newUserId = updatedTask.assignedUser;
            const taskIsCompleted = updatedTask.completed;

            if (oldUserId !== newUserId) {
                if (oldUserId) {
                    await User.findByIdAndUpdate(oldUserId, { $pull: { pendingTasks: updatedTask._id } });
                }
                if (newUserId && !taskIsCompleted) {
                    await User.findByIdAndUpdate(newUserId, { $addToSet: { pendingTasks: updatedTask._id } }); 
                }
            }
            else if (newUserId && oldTask.completed !== updatedTask.completed) {
                if (taskIsCompleted) {
                    await User.findByIdAndUpdate(newUserId, { $pull: { pendingTasks: updatedTask._id } });
                } else {
                    await User.findByIdAndUpdate(newUserId, { $addToSet: { pendingTasks: updatedTask._id } });
                }
            }

            res.status(200).json({
                message: "Task updated successfully",
                data: updatedTask
            });

        } catch (error) {
            if (error.name === 'ValidationError') {
                return res.status(400).json({ message: "Validation error", data: error.message });
            }
            res.status(500).json({
                message: "server error",
                data: error.message
            });
        }
    });

    tasksIdRoute.delete(async (req, res) => {
        try {
            const deletedTask = await Task.findByIdAndDelete(req.params.id);

            if (!deletedTask) {
                return res.status(404).json({
                    message: "task not found",
                    data: null
                });
            }
 
            if (deletedTask.assignedUser) {
                await User.findByIdAndUpdate(
                    deletedTask.assignedUser,
                    { $pull: { pendingTasks: deletedTask._id } }
                );
            }
            res.status(200).json({
                message: "task deleted successfully",
                data: deletedTask
            });

        } catch (error) {
            res.status(500).json({
                message: "server error",
                data: error.message
            });
        }
    });
    return router;
};

var User = require('../models/user.js');
var Task = require('../models/task.js');  
var mongoose = require('mongoose');

module.exports = function(router) {

    const usersRoute = router.route('/users');

    //GET /api/users
    usersRoute.get(async (req, res) => {
        try {
            let where = {};
            if (req.query.where) {
                try {
                    where = JSON.parse(req.query.where);
                } catch (e) {
                    return res.status(400).json({ message: " is not valid JSON", data: e.message });
                }
            }

            if (req.query.count === 'true') {
                const count = await User.countDocuments(where);
                return res.status(200).json({
                    message: "User count successfully",
                    data: count
                });
            }

            let query = User.find(where);
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
 
            if (req.query.limit) {
                query = query.limit(parseInt(req.query.limit));
            }

            const users = await query.exec();
            res.status(200).json({
                message: "user list retrieved successfully",
                data: users
            });

        } catch (error) {
            res.status(500).json({
                message: "Server error",
                data: error.message
            });
        }
    });

    usersRoute.post(async (req, res) => {
        try {
            const newUser = new User(req.body);
            await newUser.save();

            res.status(201).json({  
                message: "user created",
                data: newUser
            });

        } catch (error) {
            if (error.name === 'ValidationError') {
                return res.status(400).json({ message: "Validation error", data: error.message });
            }
            if (error.code === 11000) {
                return res.status(400).json({ message: "Error: email already exists", data: error.message });
            }
            res.status(500).json({
                message: "server error",
                data: error.message
            });
        }
    });
    const usersIdRoute = router.route('/users/:id');

    usersIdRoute.get(async (req, res) => {
        try {
            if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
                return res.status(400).json({ message: "invalid user ID format", data: null });
            }

            let query = User.findById(req.params.id);

            if (req.query.select) {
                try {
                    query = query.select(JSON.parse(req.query.select));
                } catch (e) {
                    return res.status(400).json({ message: "select is not valid", data: e.message });
                }
            }

            const user = await query.exec();

            if (!user) {
                return res.status(404).json({
                    message: "user not found",
                    data: null
                });
            }

            res.status(200).json({
                message: "tuser retrieved successfully",
                data: user
            });

        } catch (error) {
            res.status(500).json({
                message: "server error",
                data: error.message
            });
        }
    });

 
usersIdRoute.put(async (req, res) => {
        try {
            const { name, email } = req.body;
            if (!name || !email) {
                return res.status(400).json({ message: "name and deadline are required for update", data: null });
            }

            const oldUser = await User.findById(req.params.id);
            if (!oldUser) {
                return res.status(404).json({ message: "ser not found", data: null });
            }
            const oldTaskIds = new Set(oldUser.pendingTasks.map(id => id.toString()));

            const updatedUserData = req.body;
            const updatedUser = new User(updatedUserData);  
 
            const newTaskIds = new Set(updatedUser.pendingTasks.map(id => id.toString()));
 
            const tasksToUnassign = [...oldTaskIds].filter(id => !newTaskIds.has(id));
            const tasksToAssign = [...newTaskIds].filter(id => !oldTaskIds.has(id));
 
            if (tasksToAssign.length > 0) {
                const tasksToVerify = await Task.find({ _id: { $in: tasksToAssign } });
                if (tasksToVerify.length !== tasksToAssign.length) {
                    return res.status(404).json({
                        message: "one or more new task IDs in pendingTasks do not exist.",
                        data: null
                    });
                }
                
                const hasCompletedTask = tasksToVerify.some(task => task.completed);
                if (hasCompletedTask) {
                    return res.status(400).json({
                        message: "can not add a completed task to pendingTasks.",
                        data: null
                    });
                }
            }

            const finalUpdatedUser = await User.findByIdAndUpdate(
                req.params.id,
                req.body,
                { new: true, runValidators: true }
            );
            if (tasksToUnassign.length > 0) {
                await Task.updateMany(
                    { _id: { $in: tasksToUnassign } },
                    { $set: { assignedUser: "", assignedUserName: "unassigned" } }
                );
            }

            if (tasksToAssign.length > 0) {
                await Task.updateMany(
                    { _id: { $in: tasksToAssign } },
                    { $set: { assignedUser: finalUpdatedUser._id, assignedUserName: finalUpdatedUser.name } }
                );
            }
            res.status(200).json({
                message: "User updated successfully and tasks synchronized",
                data: finalUpdatedUser
            });

        } catch (error) {
            if (error.code === 11000) {
                return res.status(400).json({ message: "email already exists", data: error.message });
            }
            if (error.name === 'ValidationError') {
                return res.status(400).json({ message: "Validation error", data: error.message });
            }
            res.status(500).json({
                message: "server error",
                data: error.message
            });
        }
    });

    usersIdRoute.delete(async (req, res) => {
        try {
            const deletedUser = await User.findByIdAndDelete(req.params.id);

            if (!deletedUser) {
                return res.status(404).json({
                    message: "User not found",
                    data: null
                });
            }

            await Task.updateMany(
                { assignedUser: deletedUser._id },
                { $set: { assignedUser: "", assignedUserName: "unassigned" } }
            );
            res.status(200).json({
                message: "User deleted successfully and their tasks have been unassigned",
                data: deletedUser
            });
        } catch (error) {
            res.status(500).json({
                message: "Server error",
                data: error.message
            });
        }
    });
    return router;
};


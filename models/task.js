// models/Task.js

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const TaskSchema = new Schema({
    name: {
        type: String,
        required: [true, 'Task name is required.'] 
    },
    description: {
        type: String,
        default: ""
    },
    deadline: {
        type: Date,
        required: true 
    },
    completed: {
        type: Boolean,
        default: false 
    },
    assignedUser: {
        type: String,
        default: ""
    },
    assignedUserName: {
        type: String,
        default: "unassigned"  
    },
    dateCreated: {
        type: Date,
        default: Date.now  
    }
});


module.exports = mongoose.model('Task', TaskSchema);
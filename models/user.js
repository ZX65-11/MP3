// Load required packages
var mongoose = require('mongoose');
var Schema = mongoose.Schema; 

// Define our user schema
var UserSchema = new Schema({
    name: {
        type: String,
        required: true 
    },
    email: {
        type: String,
        required: true, 
        unique: true   
    },
    pendingTasks: [String], 
    dateCreated: {
        type: Date,
        default: Date.now 
    }
});

// Export the Mongoose model
// This makes the model available to other files in your Node app
module.exports = mongoose.model('User', UserSchema);

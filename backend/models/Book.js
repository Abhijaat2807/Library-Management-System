import mongoose from "mongoose";   
const bookSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true
    },
    author: {
        type: String,
        required: true,
        trim: true
    },
      
  genre: {
        type: String,
        required: true,
        trim: true
    },

    totalCopies: {
        type: Number,
        required: true,
        default: 1,
        min: 1
    },
    availableCopies: {
        type: Number,
        required: true,
        default: 1,
        min: 0
    },
    isDeleted: {
        type: Boolean,
        default: false
    }

      
     },{
    timestamps: true
        }); 

export default mongoose.model("books", bookSchema);
  

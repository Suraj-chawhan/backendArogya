require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const cloudinary = require("cloudinary").v2;
const morgan = require("morgan");

const app = express();
app.use(morgan("dev"));

app.use(express.json());
app.use(cors());

mongoose
  .connect(
    "mongodb+srv://hunny:hunny442917@cluster0.je4hs.mongodb.net/Argogyalatest2",
    {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    }
  )
  .then(() => console.log("MongoDB Connected"))
  .catch((err) => console.log(err));

cloudinary.config({
  cloud_name: "dqqwrgmo9",
  api_key: "179142844963948",
  api_secret: "Q_PcXWQLar55XCUTMXuR-S-sQwA",
});

const ProblemSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
});

const MedicalFormSchema = new mongoose.Schema(
  {
    recordType: { type: String, required: true },
    title: { type: String, required: true },
    doctor: { type: String, required: true },
    hospital: { type: String, required: true },
    location: { type: String, required: true },
    problem_list: [ProblemSchema],
    image: { type: String },
  },
  { timestamps: true }
);

const MedicalForm = mongoose.model("MedicalForm", MedicalFormSchema);

//Get all data
app.get("/medical-forms", async (req, res) => {
  try {
    const forms = await MedicalForm.find();
    res.status(200).json(forms);
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
});

//Post data
app.post("/submit", async (req, res) => {
  try {
    const {
      recordType,
      title,
      doctor,
      hospital,
      location,
      problem_list,
      image,
    } = req.body;

    const problemsArray =
      typeof problem_list === "string"
        ? JSON.parse(problem_list)
        : problem_list;
    if (!Array.isArray(problemsArray)) {
      return res.status(400).json({
        success: false,
        message: "Invalid problem_list format. Must be an array.",
      });
    }

    const newForm = new MedicalForm({
      recordType,
      title,
      doctor,
      hospital,
      location,
      problem_list: problemsArray,
      image,
    });
    await newForm.save();

    res.status(201).json({
      success: true,
      message: "Medical form created successfully",
      data: newForm,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error creating medical form",
      error: error.message,
    });
  }
});

// Update a medical form
app.put("/medical-forms/:id", async (req, res) => {
  try {
    const updatedForm = await MedicalForm.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    if (!updatedForm) {
      return res
        .status(404)
        .json({ success: false, message: "Medical form not found" });
    }
    res.status(200).json({
      success: true,
      message: "Medical form updated successfully",
      data: updatedForm,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error updating medical form",
      error: error.message,
    });
  }
});

// Delete a medical form
app.delete("/medical-forms/:id", async (req, res) => {
  try {
    const deletedForm = await MedicalForm.findByIdAndDelete(req.params.id);
    if (!deletedForm) {
      return res
        .status(404)
        .json({ success: false, message: "Medical form not found" });
    }
    res
      .status(200)
      .json({ success: true, message: "Medical form deleted successfully" });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error deleting medical form",
      error: error.message,
    });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

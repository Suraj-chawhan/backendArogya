require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const cloudinary = require("cloudinary").v2;
const morgan = require("morgan");
const multer = require("multer");
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const app = express();
app.use(morgan("dev"));

app.use(express.json());
app.use(cors());

mongoose
  .connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("MongoDB Connected"))
  .catch((err) => console.log(err));

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: "medical-forms",
    format: async (req, file) => {
      const allowedFormats = [
        "jpg",
        "jpeg",
        "png",
        "webp",
        "gif",
        "bmp",
        "tiff",
      ];
      const fileExtension = file.mimetype.split("/")[1];
      return allowedFormats.includes(fileExtension) ? fileExtension : "png";
    },
    public_id: (req, file) => file.originalname.split(".")[0],
  },
});

const upload = multer({ storage: storage });

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

app.get("/medical-forms", async (req, res) => {
  try {
    const forms = await MedicalForm.find();
    res.status(200).json(forms);
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
});

app.post("/submit", upload.single("image"), async (req, res) => {
  try {
    const { recordType, title, doctor, hospital, location, problem_list } =
      req.body;
    const problemsArray =
      typeof problem_list === "string"
        ? JSON.parse(problem_list)
        : problem_list;

    console.log(req.file.path);

    const newForm = new MedicalForm({
      recordType,
      title,
      doctor,
      hospital,
      location,
      problem_list: problemsArray,
      image: req.file ? req.file.path : "", // Use Cloudinary URL
    });

    await newForm.save();
    res
      .status(201)
      .json({ success: true, message: "Medical form created", data: newForm });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error creating form",
      error: error.message,
    });
  }
});

app.put("/medical-forms/:id", upload.single("image"), async (req, res) => {
  try {
    const { recordType, title, doctor, hospital, location, problem_list } =
      req.body;

    console.log(req.body);

    const problemsArray =
      typeof problem_list === "string"
        ? JSON.parse(problem_list)
        : problem_list;

    const form = await MedicalForm.findById(req.params.id);

    if (!form) {
      console.log(`Medical form with ID ${req.params.id} not found.`);
      return res
        .status(404)
        .json({ success: false, message: "Medical form not found" });
    }

    if (req.file && form.image) {
      try {
        const imagePath = form.image;
        if (imagePath.includes("/upload/")) {
          const publicId = imagePath.split("/upload/")[1].split(".")[0];
          await cloudinary.uploader.destroy(publicId);
          console.log(`Deleted old image: ${publicId}`);
        }
      } catch (err) {
        console.error("Failed to delete old image:", err);
      }
    }

    // Update form data
    const updatedForm = await MedicalForm.findByIdAndUpdate(
      req.params.id,
      {
        recordType,
        title,
        doctor,
        hospital,
        location,
        problem_list: problemsArray,
        image: req.file ? req.file.path : "", // Update image only if a new one is uploaded
      },
      { new: true, runValidators: true }
    );

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

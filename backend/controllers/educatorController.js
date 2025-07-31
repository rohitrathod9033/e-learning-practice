import { clerkClient } from "@clerk/express";
import Course from "../models/Course.js"; 
import { v2 as cloudinary } from "cloudinary";
import User from "../models/User.js";

// Update Role to Educator.....
export const updateRoleToEducator = async (req, res) => {
  try {
    const userId = req.auth.userId;

    await clerkClient.users.updateUserMetadata(userId, {
      publicMetadata: {
        role: "educator",
      },
    });

    res.json({ success: true, message: "You can publish a course now" });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
};

// Add New Course
export const addCourse = async (req, res) => {
  try {
    const { courseData } = req.body;
    const imageFile = req.file;
    const educatorId = req.auth.userId;

    if (!imageFile) {
      return res.json({
        success: false,
        message: "Thumbnail Not Attached",
      });
    }

    const parsedCourseData = await JSON.parse(courseData);
    parsedCourseData.educator = educatorId;

    const newCourse = await Course.create(parsedCourseData);
    const imageUpload = await cloudinary.uploader.upload(imageFile.path);
    newCourse.courseThumbnail = imageUpload.secure_url;

    await newCourse.save();

    res.json({ success: true, message: "Course Added" });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
};



// Get Educator Courses
export const getEducatorCourses = async (req, res) => {
  try {
    const educator = req.auth.userId;
    const courses = await Course.find({ educator });
    res.json({ success: true, courses });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
};


// Get Educator Dashboard Data (Total Earning, Enrolled Students, No. of Courses)
export const educatorDashboardData = async (req, res) => {
  try {
    const educator = req.auth.userId;

    // Fetch courses by educator
    const courses = await Course.find({educator});
    const totalCourses = courses.length;

    // Extract course IDs
    const courseIds = courses.map(course => course._id);
    
    // Calculate total earnings from completed purchases
    const purchases = await Purchase.find({
      courseId: { $in: courseIds },
      status: 'completed',
    });
    
    const totalEarnings = purchases.reduce((sum, purchase) => sum + purchase.amount, 0);
    
    // Collect unique enrolled student data
    const enrolledStudentsData = [];
    for (const course of courses) {
      const students = await User.find(
        { _id: { $in: course.enrolled } },
        'name imageUrl'
      );
      
      students.forEach(student => {
        enrolledStudentsData.push({
          courseTitle: course.courseTitle,
          student,
        });
      });
    }
    
    // Send response
    res.json({
      success: true,
      dashboardData: {
        totalEarnings,
        enrolledStudentsData,
        totalCourses,
      },
    });
    
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
};


// Get Enrolled Student Data With Purchase Data.....
export const getEnrolledStudentsData = async (req, res) => {
  try {
    const educator = req.auth.userId;

    // Find all courses by this educator
    const courses = await Course.find({ educator });

    // Extract course IDs
    const courseIds = courses.map(course => course._id);

    // Find all completed purchases for these courses
    const purchases = await Purchase.find({
      courseId: { $in: courseIds },
      status: 'completed',
    })
      .populate('userId', 'name imageUrl')
      .populate('courseId', 'courseTitle');

    // Structure enrolled student data
    const enrolledStudents = purchases.map(purchase => ({
      student: purchase.userId,
      courseTitle: purchase.courseId.courseTitle,
      purchaseDate: purchase.createdAt,
    }));

    // Send response
    res.json({ success: true, enrolledStudents });
    
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
};
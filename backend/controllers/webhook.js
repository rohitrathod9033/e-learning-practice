// controllers/webhooks.js
import Stripe from "stripe";
import User from "../models/User.js";
import { Webhook } from "svix";
import { Purchase } from "../models/Purchase.js";
import Course from "../models/Course.js";

// Clerk Webhook
export const clerkWebhooks = async (req, res) => {
  try {
    const whook = new Webhook(process.env.CLERK_WEBHOOK_SECRET);

    await whook.verify(JSON.stringify(req.body), {
      "svix-id": req.headers["svix-id"],
      "svix-timestamp": req.headers["svix-timestamp"],
      "svix-signature": req.headers["svix-signature"],
    });

    const { type, data } = req.body;

    switch (type) {
      case "user.created": {
        const userData = {
          _id: data.id,
          email: data.email_addresses[0].email_address,
          name: data.first_name + " " + data.last_name,
          imageUrl: data.image_url,
        };
        await User.create(userData);
        res.json({});
        break;
      }

      case "user.updated": {
        const userData = {
          email: data.email_addresses[0].email_address,
          name: data.first_name + " " + data.last_name,
          imageUrl: data.image_url,
        };
        await User.findByIdAndUpdate(data.id, userData);
        res.json({});
        break;
      }

      case "user.deleted": {
        await User.findByIdAndDelete(data.id);
        res.json({});
        break;
      }

      default:
        res.status(200).json({ message: "Unhandled event type" });
        break;
    }
  } catch (error) {
    console.error("Clerk webhook error:", error);
    res.json({ success: false, message: error.message });
  }
};

// Stripe Webhook
const stripeInstance = new Stripe(process.env.STRIPE_SECRET_KEY);

export const stripeWebhooks = async (request, response) => {
  console.log('🔔 Stripe webhook received');
  
  const sig = request.headers["stripe-signature"];

  let event;
  try {
    event = Stripe.webhooks.constructEvent(
      request.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
    console.log('✅ Webhook verified. Event type:', event.type);
  } catch (err) {
    console.error('❌ Webhook verification failed:', err.message);
    return response.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle Event
  switch (event.type) {
    case "payment_intent.succeeded": {
      try {
        console.log('💳 Processing payment success...');
        
        const paymentIntent = event.data.object;
        const paymentIntentId = paymentIntent.id;

        const session = await stripeInstance.checkout.sessions.list({
          payment_intent: paymentIntentId,
        });

        if (!session.data || session.data.length === 0) {
          console.error('❌ No session found for payment intent:', paymentIntentId);
          return response.status(400).json({ error: 'No session found' });
        }

        const { purchaseId } = session.data[0].metadata;

        if (!purchaseId) {
          console.error('❌ No purchaseId in session metadata');
          return response.status(400).json({ error: 'No purchaseId found' });
        }

        console.log('📦 Purchase ID:', purchaseId);

        const purchaseData = await Purchase.findById(purchaseId);
        if (!purchaseData) {
          console.error('❌ Purchase not found:', purchaseId);
          return response.status(404).json({ error: 'Purchase not found' });
        }

        const userData = await User.findById(purchaseData.userId);
        if (!userData) {
          console.error('❌ User not found:', purchaseData.userId);
          return response.status(404).json({ error: 'User not found' });
        }

        const courseData = await Course.findById(purchaseData.courseId.toString());
        if (!courseData) {
          console.error('❌ Course not found:', purchaseData.courseId);
          return response.status(404).json({ error: 'Course not found' });
        }

        // ✅ FIX: Push user ID (string), not user object
        if (!courseData.enrolledStudents.includes(userData._id)) {
          courseData.enrolledStudents.push(userData._id);
          await courseData.save();
          console.log('✅ Student added to course:', courseData.courseTitle);
        } else {
          console.log('⚠️ Student already enrolled in course');
        }

        // ✅ FIX: Check before adding to prevent duplicates
        if (!userData.enrolledCourses.includes(courseData._id)) {
          userData.enrolledCourses.push(courseData._id);
          await userData.save();
          console.log('✅ Course added to user enrollments');
        } else {
          console.log('⚠️ Course already in user enrollments');
        }

        purchaseData.status = "completed";
        await purchaseData.save();
        console.log('✅ Purchase marked as completed');

      } catch (error) {
        console.error('❌ Error processing payment success:', error);
        return response.status(500).json({ error: error.message });
      }
      break;
    }

    case "payment_intent.payment_failed": {
      try {
        console.log('❌ Processing payment failure...');
        
        const paymentIntent = event.data.object;
        const paymentIntentId = paymentIntent.id;

        const session = await stripeInstance.checkout.sessions.list({
          payment_intent: paymentIntentId,
        });

        const { purchaseId } = session.data[0].metadata;

        const purchaseData = await Purchase.findById(purchaseId);
        purchaseData.status = "failed";
        await purchaseData.save();
        
        console.log('Purchase marked as failed:', purchaseId);
      } catch (error) {
        console.error('❌ Error processing payment failure:', error);
        return response.status(500).json({ error: error.message });
      }
      break;
    }

    default:
      console.log(`ℹ️ Unhandled event type: ${event.type}`);
  }

  response.json({ received: true });
};
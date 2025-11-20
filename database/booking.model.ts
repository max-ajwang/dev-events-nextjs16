// database/booking.model.ts
// Booking model with event reference validation

import mongoose, { Schema, Document, Model, Types } from "mongoose";

// TypeScript interface for the Booking document
export interface IBooking extends Document {
  eventId: Types.ObjectId;
  email: string;
  createdAt: Date;
  updatedAt: Date;
}

const BookingSchema = new Schema<IBooking>(
  {
    eventId: {
      type: Schema.Types.ObjectId,
      ref: "Event",
      required: [true, "Event ID is required"],
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      trim: true,
      lowercase: true,
      validate: {
        validator: function (email: string) {
          // RFC 5322 compliant email regex (simplified version)
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          return emailRegex.test(email);
        },
        message: "Please provide a valid email address",
      },
    },
  },
  {
    timestamps: true, // Automatically adds createdAt and updatedAt
  }
);

// Pre-save hook: Validate that the referenced event exists
BookingSchema.pre("save", async function (next) {
  // Only validate if eventId is new or modified
  if (this.isModified("eventId")) {
    try {
      // Dynamically import Event model to avoid circular dependency
      const Event = mongoose.models.Event || (await import("./event.model")).default;
      
      const eventExists = await Event.exists({ _id: this.eventId });
      
      if (!eventExists) {
        return next(new Error(`Event with ID ${this.eventId} does not exist`));
      }
    } catch (error) {
      if (error instanceof Error) {
        return next(error);
      }
      return next(new Error("Failed to validate event reference"));
    }
  }

  next();
});

// Create index on eventId for faster queries (e.g., fetching all bookings for an event)
BookingSchema.index({ eventId: 1 });

// Create compound index for event + email to prevent duplicate bookings
BookingSchema.index({ eventId: 1, email: 1 }, { unique: true });

// Create and export the Booking model
// Use singleton pattern to prevent model recompilation in Next.js development
const Booking: Model<IBooking> =
  mongoose.models.Booking || mongoose.model<IBooking>("Booking", BookingSchema);

export default Booking;

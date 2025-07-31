import React from "react";
import { assets, dummyTestimonial } from "../../assets/assets";

const TestimonialsSection = () => {
  return (
    <section className="px-8 md:px-0 pb-14">
      <h2 className="text-3xl font-medium text-gray-800">Testimonials</h2>
      <p className="text-base text-gray-500 mt-3">
        Hear from our learners as they share their journeys of transformation,
        success, and how our <br className="hidden md:block" /> platform has made a difference in their lives.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mt-14">
        {dummyTestimonial.map((testimonial, index) => (
          <div
            key={index}
            className="border border-gray-300 rounded-lg bg-white shadow-[0px_4px_15px_0px_rgba(0,0,0,0.05)] overflow-hidden"
          >
            <div className="flex items-center gap-4 px-5 py-4 bg-gray-100">
              <img
                src={testimonial.image}
                alt={testimonial.name}
                className="h-12 w-12 rounded-full"
              />
              <div>
                <h3 className="text-lg font-medium text-gray-800">
                  {testimonial.name}
                </h3>
                <p className="text-sm text-gray-600">{testimonial.role}</p>
              </div>
            </div>

            <div className="p-5">
              <div className="flex gap-0.5">
                {[...Array(5)].map((_, i) => (
                  <img
                    key={i}
                    src={i < Math.floor(testimonial.rating) ? assets.star : assets.star_blank}
                    alt="star"
                    className="h-5"
                  />
                ))}
              </div>
              <p className="text-gray-500 mt-4">{testimonial.feedback}</p>
              <a href="#" className="text-blue-500 underline mt-3 inline-block">
                Read more
              </a>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};

export default TestimonialsSection;

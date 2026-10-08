import { ContactForm } from "@/features/contact/contact-form";

export const metadata = { title: "Contact us" };

export default function ContactPage() {
  return (
    <div data-narrow>
      <h1 className="mb-2 font-heading text-[32px] font-extrabold">Contact Us</h1>
      <p className="mb-8 text-sm leading-relaxed text-muted-foreground">
        Questions, feedback, or a partnership inquiry — send us a message and we'll get back to you.
        You can also reach us directly at{" "}
        <strong className="text-body">sistercircleplus@protonmail.com</strong>.
      </p>
      <ContactForm />
    </div>
  );
}

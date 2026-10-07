import { ContactForm } from "@/features/contact/contact-form";

export const metadata = { title: "Contact us" };

export default function ContactPage() {
  return (
    <div data-narrow>
      <h1 className="font-heading mb-2 text-[32px] font-extrabold">Contact Us</h1>
      <p className="text-muted-foreground mb-8 text-sm leading-relaxed">
        Questions, feedback, or a partnership inquiry — send us a message and we'll get back to
        you. You can also reach us directly at{" "}
        <strong className="text-body">sistercircleplus@protonmail.com</strong>.
      </p>
      <ContactForm />
    </div>
  );
}

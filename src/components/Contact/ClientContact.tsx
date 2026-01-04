"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { motion } from "framer-motion";
import Image from "next/image";
import { useInView } from "react-intersection-observer";
import {
  Send,
  CheckCircle,
  Phone,
  Mail,
  MapPin,
  MessageCircle,
  Globe,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils/cn";
import { contactSchema } from "@/lib/validations/contact";
import { submitContactForm } from "@/actions/public/contact";

type Translations = {
  hero: { title: string; subtitle: string };
  form: {
    title: string;
    description: string;
    name_label: string;
    name_placeholder: string;
    email_label: string;
    email_placeholder: string;
    subject_label: string;
    subject_placeholder: string;
    message_label: string;
    message_placeholder: string;
    submit: string;
    sending: string;
    sent: string;
    success: string;
    error_generic: string;
    error_network: string;
  };
  info: {
    title: string;
    phone: { title: string; number: string; hours?: string };
    email: { title: string; address: string };
    address: { title: string; text: string };
    online: { title: string; hours?: string; link?: string; link_text?: string };
  };
};

type ContactInfoItem = {
  icon: "Phone" | "Mail" | "MapPin" | "MessageCircle";
  titleKey: string;
  mainKey?: string;
  subKey?: string;
  linkKey?: string;
  linkTextKey?: string;
  dir?: "ltr" | "rtl";
};

type ClientContactProps = {
  locale: string;
  translations: Translations;
  contactInfo: ContactInfoItem[];
};

const iconMap = { Phone, Mail, MapPin, MessageCircle };

export default function ClientContact({
  locale,
  translations: t,
  contactInfo,
}: ClientContactProps) {
  const isRTL = locale === "fa";
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const [heroRef, heroInView] = useInView({ threshold: 0.1, triggerOnce: true });
  const [formRef, formInView] = useInView({ threshold: 0.2, triggerOnce: true });
  const [infoRef, infoInView] = useInView({ threshold: 0.1, triggerOnce: true });

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm({
    resolver: zodResolver(contactSchema),
    defaultValues: { name: "", email: "", subject: "", message: "", honeypot: "" },
  });

  const onSubmit = async (data: any) => {
    if (data.honeypot) {
      toast.success(t.form.success);
      reset();
      setSuccess(true);
      return;
    }

    setLoading(true);
    try {
      const result = await submitContactForm(data);
      if (result.success) {
        toast.success(t.form.success);
        setSuccess(true);
        reset();
      } else {
        toast.error(result.error || t.form.error_generic);
      }
    } catch {
      toast.error(t.form.error_network);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-6  max-w-7xl">
      {/* Hero Section */}
      <motion.section
        ref={heroRef}
        initial={{ opacity: 0, y: 40 }}
        animate={heroInView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 1 }}
        className="relative overflow-hidden rounded-3xl mb-32 min-h-[80vh] flex items-center justify-center text-center"
      >
        <Image
          src="/contact/hero-bg.webp"
          alt=""
          fill
          sizes="100vw"
          className="object-cover object-center"
          priority
          quality={95}
        />

        <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-black/50 to-black/90 pointer-events-none z-0" />
        <div className="absolute inset-0 bg-gradient-to-tr from-primary/30 via-transparent to-secondary/25 pointer-events-none z-0" />

        <div className="relative z-10 px-6 max-w-5xl mx-auto">
          <h1 className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-black mb-10 bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent drop-shadow-2xl">
            {t.hero.title}
          </h1>
          <p className="text-xl md:text-3xl text-foreground/90 max-w-4xl mx-auto leading-relaxed drop-shadow-xl">
            {t.hero.subtitle}
          </p>
        </div>
      </motion.section>

      {/* فرم و اطلاعات تماس */}
      <div className="grid lg:grid-cols-2 gap-16 lg:gap-24">
        {/* فرم تماس – جایگزین Card با div */}
        <motion.div
          ref={formRef}
          initial={{ opacity: 0, x: isRTL ? 50 : -50 }}
          animate={formInView ? { opacity: 1, x: 0 } : {}}
          transition={{ duration: 0.8 }}
        >
          <div className="rounded-3xl bg-card/95 backdrop-blur-2xl border border-border/50 shadow-2xl hover:shadow-3xl transition-shadow">
            <div className="p-10 pb-8">
              <h3 className="text-4xl font-black">{t.form.title}</h3>
              <p className="text-lg mt-4 text-muted-foreground">{t.form.description}</p>
            </div>

            <div className="px-10 pb-10">
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-10" noValidate>
                <div className="hidden">
                  <input
                    type="text"
                    tabIndex={-1}
                    autoComplete="off"
                    {...register("honeypot")}
                  />
                </div>

                {/* نام و ایمیل – با flex به جای grid */}
                <div className="flex flex-col sm:flex-row gap-8">
                  <div className="flex-1 space-y-3">
                    <Label htmlFor="name" className="text-base font-semibold">
                      {t.form.name_label}
                    </Label>
                    <Input
                      id="name"
                      placeholder={t.form.name_placeholder}
                      {...register("name")}
                      disabled={loading}
                      className="h-14 text-lg"
                    />
                    {errors.name && (
                      <p className="text-sm text-red-600 mt-1">
                        {errors.name.message as string}
                      </p>
                    )}
                  </div>

                  <div className="flex-1 space-y-3">
                    <Label htmlFor="email" className="text-base font-semibold">
                      {t.form.email_label}
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder={t.form.email_placeholder}
                      {...register("email")}
                      disabled={loading}
                      className="h-14 text-lg"
                    />
                    {errors.email && (
                      <p className="text-sm text-red-600 mt-1">
                        {errors.email.message as string}
                      </p>
                    )}
                  </div>
                </div>

                <div className="space-y-3">
                  <Label htmlFor="subject" className="text-base font-semibold">
                    {t.form.subject_label}
                  </Label>
                  <Input
                    id="subject"
                    placeholder={t.form.subject_placeholder}
                    {...register("subject")}
                    disabled={loading}
                    className="h-14 text-lg"
                  />
                  {errors.subject && (
                    <p className="text-sm text-red-600 mt-1">
                      {errors.subject.message as string}
                    </p>
                  )}
                </div>

                <div className="space-y-3">
                  <Label htmlFor="message" className="text-base font-semibold">
                    {t.form.message_label}
                  </Label>
                  <Textarea
                    id="message"
                    placeholder={t.form.message_placeholder}
                    rows={8}
                    {...register("message")}
                    disabled={loading}
                    className="text-lg resize-none"
                  />
                  {errors.message && (
                    <p className="text-sm text-red-600 mt-1">
                      {errors.message.message as string}
                    </p>
                  )}
                </div>

                <div className="pt-6">
                  <Button
                    type="submit"
                    size="lg"
                    disabled={loading || success}
                    className={cn(
                      "w-full text-2xl py-10 font-black rounded-2xl shadow-2xl hover:shadow-3xl hover:scale-105 transition-all duration-500 group",
                      "bg-gradient-to-r from-primary to-secondary text-white"
                    )}
                  >
                    {loading ? (
                      <span className="flex items-center justify-center gap-5">
                        <div className="w-8 h-8 border-4 border-white/30 border-t-white rounded-full animate-spin" />
                        {t.form.sending}
                      </span>
                    ) : success ? (
                      <span className="flex items-center justify-center gap-5">
                        <CheckCircle className="size-10" />
                        {t.form.sent}
                      </span>
                    ) : (
                      <span className="flex items-center justify-center gap-5">
                        {t.form.submit}
                        <Send
                          className={cn(
                            "size-10 transition-transform duration-500 group-hover:translate-x-4",
                            isRTL && "rotate-180 group-hover:-translate-x-4"
                          )}
                        />
                      </span>
                    )}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </motion.div>

        {/* اطلاعات تماس – جایگزین Card با div */}
        <motion.div
          ref={infoRef}
          initial={{ opacity: 0, x: isRTL ? -50 : 50 }}
          animate={infoInView ? { opacity: 1, x: 0 } : {}}
          transition={{ duration: 0.8 }}
        >
          <div className="rounded-3xl bg-card/95 backdrop-blur-2xl border border-border/50 shadow-2xl hover:shadow-3xl transition-shadow h-fit">
            <div className="p-10 pb-8">
              <h3 className="text-4xl font-black">{t.info.title}</h3>
            </div>

            <div className="px-10 pb-10 space-y-12">
              {contactInfo.map((item, i) => {
                const IconComponent = iconMap[item.icon];

                const mainText =
                  item.icon === "Phone"
                    ? t.info.phone.number
                    : item.icon === "Mail"
                    ? t.info.email.address
                    : item.icon === "MapPin"
                    ? t.info.address.text
                    : "";
                const subText =
                  item.icon === "Phone"
                    ? t.info.phone.hours || ""
                    : item.icon === "MessageCircle"
                    ? t.info.online.hours || ""
                    : "";
                const link = item.icon === "MessageCircle" ? t.info.online.link || "" : "";
                const linkText = item.icon === "MessageCircle" ? t.info.online.link_text || "" : "";

                const titleText =
                  item.icon === "Phone"
                    ? t.info.phone.title
                    : item.icon === "Mail"
                    ? t.info.email.title
                    : item.icon === "MapPin"
                    ? t.info.address.title
                    : t.info.online.title;

                return (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 20 }}
                    animate={infoInView ? { opacity: 1, y: 0 } : {}}
                    transition={{ delay: i * 0.15 }}
                    className="flex items-start gap-8"
                  >
                    <div className="w-20 h-20 bg-gradient-to-br from-primary to-secondary rounded-3xl flex items-center justify-center flex-shrink-0 shadow-xl">
                      <IconComponent className="size-10 text-white" aria-hidden="true" />
                    </div>

                    <div className="flex-1 space-y-3">
                      <p className="font-bold text-2xl">{titleText}</p>
                      {mainText && (
                        <p
                          className={cn(
                            "text-3xl text-primary font-black break-all",
                            item.dir === "ltr" && "direction-ltr text-left"
                          )}
                        >
                          {mainText}
                        </p>
                      )}
                      {subText && <p className="text-muted-foreground text-lg">{subText}</p>}
                      {link && linkText && (
                        <div className="pt-2">
                          <Button
                            variant="link"
                            asChild
                            className="p-0 h-auto text-primary text-xl font-semibold hover:text-primary/80 group"
                          >
                            <a
                              href={link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-3"
                            >
                              <Globe className="size-7 transition-transform duration-300 group-hover:scale-110" />
                              <span className="border-b-2 border-transparent group-hover:border-primary transition-colors pb-1">
                                {linkText}
                              </span>
                            </a>
                          </Button>
                        </div>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
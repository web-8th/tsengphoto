'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { CalendarIcon, Loader2, SendHorizonal } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { OptimizedImage } from '@/components/OptimizedImage';
import { Text } from '@/components/Text';
import { Checkbox } from '@/components/ui';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui';
import { Calendar } from '@/components/ui/calendar';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/hooks/use-auth';
import { contactSchema, sendContactForm, SERVICES } from '@/services/contact.service';
import { getDelayClass } from '@/utils/animations';
import { useMutation } from '@tanstack/react-query';
import { format } from 'date-fns';
import { toast } from 'sonner';

type ContactFormValues = z.infer<typeof contactSchema>;

function Required() {
  return <Text variant='caption'>*</Text>;
}

function SuccessMessage({ onReset }: { onReset: () => void }) {
  return (
    <div className={'flex flex-col justify-center text-center items-center gap-6 py-8'}>
      <Separator
        className={`w-12 h-px fade-in-from-right fade-in-from-left ${getDelayClass(1)}`}
      />
      {/* make this swipe left to right */}
      <div className='relative flex items-center justify-center'>
        {/* Icon sweeps across the full width of the text */}
        <SendHorizonal className='absolute sweep-across' />
        <Text variant='hd-md' className={`fade-in-from-left ${getDelayClass(27)}`}>
          Message received.
        </Text>
      </div>
      <Text variant='bd-md' className={`fade-in-from-left ${getDelayClass(28)}`}>
        Thank you for reaching out. I&lsquo;ll be in touch with you shortly to discuss
        your project.
      </Text>
      <Button
        variant='link'
        onClick={onReset}
        className={`fade-in-from-left ${getDelayClass(29)}`}
      >
        Send another message
      </Button>
    </div>
  );
}

export default function ContactPage() {
  const [submitted, setSubmitted] = useState(false);
  const { isAuthenticated } = useAuth();

  const form = useForm<ContactFormValues>({
    resolver: zodResolver(contactSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      services: [SERVICES.GENERAL_INQUIRIES],
      preferredDate: undefined,
      message: '',
    },
  });

  const contactMutation = useMutation({
    mutationFn: async (values: ContactFormValues) => {
      await sendContactForm(values, isAuthenticated);
    },
    onSuccess: () => {
      setSubmitted(true);
      toast.success('Message sent', {
        description: 'Your message has been sent successfully.',
      });
    },
    onError: (error: Error) => {
      form.setError('root', { message: error.message });
      toast.error('Failed to send message', {
        description: error.message,
      });
    },
  });

  const onSubmit = (values: ContactFormValues) => {
    contactMutation.mutate(values);
  };

  return (
    <section className='min-h-screen flex flex-col lg:flex-row fade-in-from-bottom'>
      {/* ── Left: Photo panel ── */}
      <div
        className='relative h-[50vh] lg:sticky lg:top-0 lg:h-screen w-full lg:w-[65%]
          overflow-hidden shrink-0'
      >
        <OptimizedImage
          src='/contact/contact.webp'
          alt='Crowd celebrating at a welcome center event'
          className='w-full h-full object-cover'
          fill
        />
        <div
          className='absolute inset-0 bg-linear-to-t from-black/60 via-black/10
            to-transparent'
        />
        <div
          className={`absolute bottom-10 left-8 right-8 fade-in-from-bottom
            ${getDelayClass(10)}`}
        >
          <Text variant='caption' className={`fade-in-from-bottom ${getDelayClass(11)}`}>
            Let&lsquo;s make some memories.
          </Text>

          <div className={`fade-in-from-bottom ${getDelayClass(12)}`}>
            <Text variant='hd-lg'>Book a session with</Text>
            <Text variant='hd-xl' className={`fade-in-from-bottom ${getDelayClass(13)}`}>
              Tseng Photography.
            </Text>
          </div>
        </div>
      </div>

      {/* ── Right: Form panel ── */}
      <div
        className='flex-1 flex flex-col justify-center px-8 md:px-14 lg:px-16 py-20
          lg:py-24'
      >
        <div className='max-w-130 w-full mx-auto lg:mx-0'>
          {submitted ? (
            <SuccessMessage
              onReset={() => {
                form.reset();
                setSubmitted(false);
              }}
            />
          ) : (
            <>
              <div className='mb-12'>
                <Text className={`fade-in-from-right ${getDelayClass(0)}`}>Contact</Text>
                <Text
                  variant='hd-lg'
                  className={`leading-tight fade-in-from-right ${getDelayClass(1)}`}
                >
                  Tell me about your project
                </Text>
                <Text
                  variant='caption'
                  className={`fade-in-from-right ${getDelayClass(2)}`}
                >
                  Fill out the form below and I&apos;ll be in touch shortly.
                </Text>
              </div>

              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-6'>
                  {/* Name row */}
                  <div
                    className={`grid grid-cols-2 gap-4 fade-in-from-right
                      ${getDelayClass(3)}`}
                  >
                    <FormField
                      control={form.control}
                      name='firstName'
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>
                            First Name <Required />
                          </FormLabel>
                          <FormControl>
                            <Input {...field} placeholder='Jane' />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name='lastName'
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>
                            Last Name <Required />
                          </FormLabel>
                          <FormControl>
                            <Input {...field} placeholder='Doe' />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Email */}
                  <div className={`fade-in-from-right ${getDelayClass(4)}`}>
                    <FormField
                      control={form.control}
                      name='email'
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>
                            Email <Required />
                          </FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              type='email'
                              placeholder='jane@example.com'
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Phone */}
                  <div className={`fade-in-from-right ${getDelayClass(5)}`}>
                    <FormField
                      control={form.control}
                      name='phone'
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Phone</FormLabel>
                          <FormControl>
                            <Input {...field} type='tel' placeholder='(XXX) XXX-XXXX' />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Services */}
                  <div className={`fade-in-from-right ${getDelayClass(6)}`}>
                    <FormField
                      control={form.control}
                      name='services'
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>
                            Services <Required />
                          </FormLabel>
                          <div className='flex gap-6'>
                            {Object.values(SERVICES).map((service) => (
                              <FormItem
                                key={service}
                                className='flex items-center gap-2.5 space-y-0'
                              >
                                <FormControl>
                                  <Checkbox
                                    checked={field.value?.includes(service) ?? false}
                                    onCheckedChange={(checked) => {
                                      const current = field.value ?? [];
                                      field.onChange(
                                        checked
                                          ? [...current, service]
                                          : current.filter((s) => s !== service)
                                      );
                                    }}
                                  />
                                </FormControl>
                                <FormLabel>{service}</FormLabel>
                              </FormItem>
                            ))}
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Preferred Date */}
                  <div className={`fade-in-from-right ${getDelayClass(7)}`}>
                    <FormField
                      control={form.control}
                      name='preferredDate'
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Preferred Date</FormLabel>
                          <Popover>
                            <FormControl>
                              <PopoverTrigger
                                render={
                                  <Button
                                    variant='outline'
                                    className={`w-full justify-start text-left font-normal
                                      ${!field.value && 'text-muted-foreground'} `}
                                  />
                                }
                              >
                                <CalendarIcon />
                                {field.value ? (
                                  format(field.value, 'PPP')
                                ) : (
                                  <span>Pick a date</span>
                                )}
                              </PopoverTrigger>
                            </FormControl>
                            <PopoverContent className='w-auto p-0' align='start'>
                              <Calendar
                                mode='single'
                                selected={field.value}
                                onSelect={field.onChange}
                                disabled={(date) =>
                                  date < new Date(new Date().setHours(0, 0, 0, 0))
                                }
                              />
                            </PopoverContent>
                          </Popover>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Message */}
                  <div className={`fade-in-from-right ${getDelayClass(8)}`}>
                    <FormField
                      control={form.control}
                      name='message'
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Message</FormLabel>
                          <FormControl>
                            <Textarea
                              {...field}
                              rows={4}
                              placeholder='Tell me a bit about your vision...'
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Submit */}
                  <div className={`pt-2 fade-in-from-right ${getDelayClass(9)}`}>
                    <Button
                      type='submit'
                      disabled={contactMutation.isPending}
                      className='w-full h-12'
                    >
                      {contactMutation.isPending ? (
                        <>
                          <Loader2 className='size-4 animate-spin' />
                          Sending...
                        </>
                      ) : (
                        'Send Message'
                      )}
                    </Button>
                  </div>
                </form>
              </Form>
            </>
          )}
        </div>
      </div>
    </section>
  );
}

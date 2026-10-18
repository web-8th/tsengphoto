'use client';

import { Button } from '@/components/ui/button';
import { Logo } from '@/components/Logo';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Input,
  Spinner,
} from '@/components/ui';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';

import { Text } from '@/components/Text';
import { signInWithEmail } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { getDelayClass } from '@/utils/animations';
import { useMutation } from '@tanstack/react-query';
import { LogIn } from 'lucide-react';
import { useRouter } from 'next/navigation';

const loginSchema = z.object({
  email: z.email('Please enter a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const { toast } = useToast();
  const router = useRouter();

  const loginForm = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const loginMutation = useMutation({
    mutationFn: async (data: LoginFormValues) => {
      const { email, password } = data;
      const result = await signInWithEmail(email, password);
      if (result.error) {
        throw new Error('Invalid email or password');
      }
      return { email };
    },
    onSuccess: (data) => {
      router.push('/');
      toast.success('Login successful', {
        description: 'You are now signed in as ' + data.email.split('@')[0],
      });
    },
    onError: (error: Error) => {
      loginForm.setError('root', {
        message: error.message,
      });
      toast.error('Login failed', {
        description: 'Please check your credentials and try again.',
      });
    },
  });

  const onLoginSubmit = (data: LoginFormValues) => {
    loginMutation.mutate(data);
  };

  return (
    <div className='flex min-h-screen'>
      {/* Left Side - Logo */}
      <div
        className='hidden lg:flex lg:w-1/2 bg-primary/5 items-center justify-center p-12
          fade-in-from-left-full'
      >
        <div className='text-center space-y-6 max-w-md'>
          <Logo className={`text-4xl fade-in-from-left ${getDelayClass(2)}`} />
          <Text
            variant='muted'
            className={`fade-in-from-left w-full text-center ${getDelayClass(3)}`}
          >
            Professional event photography services in Vancouver and Kelowna. Capturing
            your special moments with creativity and precision. Book now for unforgettable
            memories.
          </Text>
        </div>
      </div>

      {/* Right Side - Login/Signup Form */}
      <div
        className='flex w-full lg:w-1/2 items-center justify-center p-6 sm:p-12
          fade-in-from-top'
      >
        <Card className='w-full max-w-md'>
          <CardHeader className='space-y-1'>
            <CardTitle
              className={`text-2xl font-bold fade-in-from-top ${getDelayClass(2)}`}
            >
              Welcome back
            </CardTitle>
            <CardDescription className={`fade-in-from-top ${getDelayClass(3)}`}>
              Enter your credentials to sign in to your account
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...loginForm} key='login-form'>
              <form
                onSubmit={loginForm.handleSubmit(onLoginSubmit)}
                className='space-y-4'
              >
                <FormField
                  control={loginForm.control}
                  name='email'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className={`fade-in-from-top ${getDelayClass(4)}`}>
                        Email
                      </FormLabel>
                      <FormControl>
                        <Input
                          type='email'
                          placeholder='m@example.com'
                          autoComplete='email'
                          {...field}
                          className={`fade-in-from-top ${getDelayClass(5)}`}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={loginForm.control}
                  name='password'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className={`fade-in-from-top ${getDelayClass(6)}`}>
                        Password
                      </FormLabel>
                      <FormControl>
                        <Input
                          type='password'
                          placeholder='Enter password'
                          autoComplete='current-password'
                          {...field}
                          className={`fade-in-from-top ${getDelayClass(7)}`}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                {loginForm.formState.errors.root && (
                  <div className='text-sm text-destructive'>
                    {loginForm.formState.errors.root.message}
                  </div>
                )}
                <Button
                  type='submit'
                  className={`w-full fade-in-from-top ${getDelayClass(8)}`}
                  disabled={loginMutation.isPending || loginMutation.isSuccess}
                >
                  {loginMutation.isPending || loginMutation.isSuccess ? (
                    <>
                      <Spinner /> Signing In...
                    </>
                  ) : (
                    <>
                      Sign In <LogIn />
                    </>
                  )}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

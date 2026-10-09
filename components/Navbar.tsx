'use client';

import { LogIn, LogOut, Menu } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useRef, useState } from 'react';

import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/animate-ui/components/';
import { Spinner } from '@/components/ui';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
  navigationMenuTriggerStyle,
} from '@/components/ui/navigation-menu';
import { signOut, useAuth } from '@/hooks/use-auth';
import { useLoading } from '@/hooks/use-loading';
import { useToast } from '@/hooks/use-toast';
import { User } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';
import { Logo } from './Logo';
import { ModeToggle } from './ModeToggle';

function LoginButton({ onClose }: { onClose?: () => void }) {
  return (
    <Button variant='outline' asChild>
      <Link href='/login' onClick={onClose}>
        <LogIn />
      </Link>
    </Button>
  );
}

function LogoutButton({ user, onClose }: { user: User; onClose?: () => void }) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const { setLoading, isLoading } = useLoading();
  const router = useRouter();
  const { toast } = useToast();

  const handleLogout = async () => {
    setLoading('auth:logout', true);
    try {
      await signOut();
      setDialogOpen(false);
      onClose?.();
      router.refresh();
      router.push('/login');
      toast.success('You have been logged out.');
      // Don't clear loading - we're navigating away
    } catch {
      toast.error('There was an issue logging you out.');
    } finally {
      setLoading('auth:logout', false);
    }
  };

  return (
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      <DialogTrigger asChild>
        <Button variant='outline'>
          {user.email?.split('@')[0]} <LogOut />
        </Button>
      </DialogTrigger>
      <DialogContent className='sm:max-w-106.25'>
        <DialogHeader>
          <DialogTitle>Logout?</DialogTitle>
        </DialogHeader>
        <DialogDescription>
          Are you sure you want to logout from your account <strong>{user.email}</strong>?
        </DialogDescription>
        <DialogFooter>
          <Button
            variant='destructive'
            onClick={handleLogout}
            disabled={isLoading('auth:logout')}
          >
            {isLoading('auth:logout') ? (
              <>
                <Spinner /> Logging Out...
              </>
            ) : (
              <>
                Logout <LogOut />
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

const portfolioLinks = [
  {
    href: '/collections',
    label: 'Collections',
    description: 'Browse through curated collections of my photography work',
  },
  {
    href: '/series',
    label: 'Series',
    description: 'Explore themed photo series and ongoing projects.',
  },
  {
    href: '/video-collections',
    label: 'Videos',
    description: 'Watch videos filmed and edited by me.',
  },
];

export function Navbar() {
  const [open, setOpen] = useState(false);
  const { user } = useAuth();
  const pathname = usePathname();
  const portfolioHoverStartRef = useRef<number | null>(null);

  const isActive = (href: string) => pathname === href;

  const handlePortfolioMouseEnter = () => {
    portfolioHoverStartRef.current = Date.now();
  };

  const handlePortfolioMouseLeave = () => {
    portfolioHoverStartRef.current = null;
  };

  const preventPortfolioClick = (e: React.MouseEvent | React.PointerEvent) => {
    // Touch devices have no hover state — allow click immediately
    if ('pointerType' in e && (e as React.PointerEvent).pointerType === 'touch') return;
    // Block click for 1 second after hover starts (dropdown opens on hover anyway)
    if (
      portfolioHoverStartRef.current !== null &&
      Date.now() - portfolioHoverStartRef.current < 1000
    ) {
      e.preventDefault();
      e.stopPropagation();
    }
  };

  return (
    <nav className='fixed z-50 w-full border-b bg-background'>
      <div className='flex pl-10 pr-10 lg:pr-38 items-center justify-between py-4'>
        {/* Logo */}
        <Logo className='text-xl' onClick={() => setOpen(false)} />

        {/* Desktop Navigation */}
        <div className='hidden items-center gap-4 lg:flex'>
          <NavigationMenu>
            <NavigationMenuList>
              <NavigationMenuItem>
                <NavigationMenuLink
                  asChild
                  className={navigationMenuTriggerStyle()}
                  data-active={isActive('/')}
                >
                  <Link href='/' aria-current={isActive('/') ? 'page' : undefined}>
                    Home
                  </Link>
                </NavigationMenuLink>
              </NavigationMenuItem>

              <NavigationMenuItem>
                <NavigationMenuTrigger
                  onClick={preventPortfolioClick}
                  onPointerDown={preventPortfolioClick}
                  onMouseDown={preventPortfolioClick}
                  onMouseEnter={handlePortfolioMouseEnter}
                  onMouseLeave={handlePortfolioMouseLeave}
                >
                  Portfolio
                </NavigationMenuTrigger>
                <NavigationMenuContent>
                  <ul className='grid w-150 gap-2 p-2 md:grid-cols-2'>
                    {portfolioLinks.map((link) => (
                      <li key={link.href}>
                        <NavigationMenuLink asChild>
                          <Link
                            href={link.href}
                            data-active={isActive(link.href)}
                            aria-current={isActive(link.href) ? 'page' : undefined}
                            className='block select-none space-y-1 rounded-md p-3 h-full
                              leading-none no-underline outline-none transition-colors
                              hover:bg-accent hover:text-accent-foreground focus:bg-accent
                              focus:text-accent-foreground'
                          >
                            <div className='text-sm font-medium leading-none'>
                              {link.label}
                            </div>
                            <p
                              className='line-clamp-2 text-sm leading-snug
                                text-muted-foreground'
                            >
                              {link.description}
                            </p>
                          </Link>
                        </NavigationMenuLink>
                      </li>
                    ))}
                  </ul>
                </NavigationMenuContent>
              </NavigationMenuItem>

              <NavigationMenuItem>
                <NavigationMenuLink
                  asChild
                  className={navigationMenuTriggerStyle()}
                  data-active={isActive('/about')}
                >
                  <Link
                    href='/about'
                    aria-current={isActive('/about') ? 'page' : undefined}
                  >
                    About
                  </Link>
                </NavigationMenuLink>
              </NavigationMenuItem>

              <NavigationMenuItem>
                <NavigationMenuLink
                  asChild
                  className={navigationMenuTriggerStyle()}
                  data-active={isActive('/contact')}
                >
                  <Link
                    href='/contact'
                    aria-current={isActive('/contact') ? 'page' : undefined}
                  >
                    Contact
                  </Link>
                </NavigationMenuLink>
              </NavigationMenuItem>

              {/* {user && (
                <NavigationMenuItem>
                  <NavigationMenuLink
                    asChild
                    className={navigationMenuTriggerStyle()}
                    data-active={isActive('/admin')}
                  >
                    <Link
                      href='/admin'
                      aria-current={isActive('/admin') ? 'page' : undefined}
                    >
                      Admin
                    </Link>
                  </NavigationMenuLink>
                </NavigationMenuItem>
              )} */}
            </NavigationMenuList>
          </NavigationMenu>

          {user ? <LogoutButton user={user} /> : <LoginButton />}
          <ModeToggle />
        </div>

        {/* Mobile Navigation - Sheet */}
        <div className='lg:hidden'>
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant='outline' size='icon'>
                <Menu className='h-6 w-6' />
                <span className='sr-only'>Toggle menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side='right' className='w-75 sm:w-100'>
              <SheetHeader>
                <SheetTitle>
                  <Logo onClick={() => setOpen(false)} />
                </SheetTitle>
              </SheetHeader>
              <div className='flex flex-col gap-6'>
                <nav className='flex flex-col gap-4 justify-center items-center'>
                  <Button
                    variant={isActive('/') ? 'default' : 'ghost'}
                    className='w-1/2'
                    asChild
                  >
                    <Link href='/' onClick={() => setOpen(false)}>
                      Home
                    </Link>
                  </Button>

                  <Accordion type='single' collapsible className='w-1/2'>
                    <AccordionItem value='portfolio' className='border-0'>
                      <AccordionTrigger
                        className='justify-center hover:bg-accent
                          hover:text-accent-foreground py-2 px-4 rounded-md
                          hover:no-underline'
                      >
                        Portfolio
                      </AccordionTrigger>
                      <AccordionContent className='pb-2'>
                        <div className='flex flex-col gap-2 pl-6 pr-2 mt-2'>
                          {portfolioLinks.map((link) => (
                            <Button
                              key={link.href}
                              variant={isActive(link.href) ? 'default' : 'ghost'}
                              size='sm'
                              className='w-full justify-end'
                              asChild
                            >
                              <Link href={link.href} onClick={() => setOpen(false)}>
                                {link.label}
                              </Link>
                            </Button>
                          ))}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>

                  <Button
                    variant={isActive('/about') ? 'default' : 'ghost'}
                    className='w-1/2'
                    asChild
                  >
                    <Link href='/about' onClick={() => setOpen(false)}>
                      About
                    </Link>
                  </Button>

                  <Button
                    variant={isActive('/contact') ? 'default' : 'ghost'}
                    className='w-1/2'
                    asChild
                  >
                    <Link href='/contact' onClick={() => setOpen(false)}>
                      Contact
                    </Link>
                  </Button>
                  {/* {user && (
                    <Button
                      variant={isActive('/admin') ? 'default' : 'ghost'}
                      className='w-1/2'
                      asChild
                    >
                      <Link href='/admin' onClick={() => setOpen(false)}>
                        Admin
                      </Link>
                    </Button>
                  )} */}

                  {user ? (
                    <LogoutButton user={user} onClose={() => setOpen(false)} />
                  ) : (
                    <LoginButton onClose={() => setOpen(false)} />
                  )}
                  <ModeToggle />
                </nav>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </nav>
  );
}

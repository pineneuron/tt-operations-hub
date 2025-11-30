'use client';

import { useEffect, useMemo, useState } from 'react';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { Form } from '@/components/ui/form';
import { FormInput } from '@/components/forms/form-input';
import { FormSelect } from '@/components/forms/form-select';
import { FormSwitch } from '@/components/forms/form-switch';
import { Button } from '@/components/ui/button';
import { useUserModal } from '@/features/users/hooks/use-user-modal';
import { ROLE_OPTIONS } from '@/features/users/components/user-tables/options';
import { UserRole } from '@/types/user-role';

const userFormSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters.'),
  email: z.string().email('Enter a valid email address.'),
  username: z
    .string()
    .min(3, 'Username must be at least 3 characters.')
    .max(32, 'Username must be 32 characters or fewer.')
    .optional()
    .or(z.literal('')),
  role: z.nativeEnum(UserRole),
  isActive: z.boolean().default(true),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters.')
    .optional()
    .or(z.literal(''))
});

type UserFormValues = z.infer<typeof userFormSchema>;

const defaultValues: UserFormValues = {
  name: '',
  email: '',
  username: '',
  role: UserRole.STAFF,
  isActive: true,
  password: ''
};

function normalizeUsername(username?: string | null) {
  const value = username?.trim();
  return value ? value : null;
}

export function UserModal() {
  const router = useRouter();
  const { isOpen, mode, user, close } = useUserModal();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const resolver = useMemo(() => zodResolver(userFormSchema), []);

  const form = useForm<UserFormValues>({
    resolver,
    defaultValues
  });

  useEffect(() => {
    if (!isOpen) return;

    if (mode === 'edit' && user) {
      form.reset({
        name: user.name ?? '',
        email: user.email,
        username: user.username ?? '',
        role: user.role,
        isActive: user.isActive,
        password: ''
      });
      return;
    }

    form.reset(defaultValues);
  }, [isOpen, mode, user, form]);

  const handleClose = () => {
    if (isSubmitting) return;
    close();
    form.reset(defaultValues);
  };

  const onSubmit = async (values: UserFormValues) => {
    try {
      setIsSubmitting(true);

      const payload = {
        name: values.name.trim(),
        email: values.email.trim(),
        username: normalizeUsername(values.username),
        role: values.role,
        isActive: values.isActive,
        password: values.password?.trim() ?? ''
      };

      if (mode === 'create' && !payload.password) {
        form.setError('password', {
          type: 'manual',
          message: 'Password is required for new users.'
        });
        setIsSubmitting(false);
        return;
      }

      const body: Record<string, unknown> = {
        name: payload.name,
        email: payload.email,
        username: payload.username,
        role: payload.role,
        isActive: payload.isActive
      };

      if (payload.password) {
        body.password = payload.password;
      }

      const endpoint =
        mode === 'create' ? '/api/users' : `/api/users/${user?.id}`;

      const response = await fetch(endpoint, {
        method: mode === 'create' ? 'POST' : 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      });

      const responseData = await response.json();

      if (!response.ok) {
        throw new Error(responseData?.message ?? 'Failed to save user.');
      }

      toast.success(
        mode === 'create' ? 'User has been created.' : 'User has been updated.'
      );

      router.refresh();
      handleClose();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Something went wrong.';
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const title = mode === 'create' ? 'Add user' : 'Update user';
  const description =
    mode === 'create'
      ? 'Provision a new TT Operations Hub user account.'
      : 'Update account details and access level.';

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className='sm:max-w-xl'>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <Form form={form} onSubmit={form.handleSubmit(onSubmit)}>
          <div className='space-y-6'>
            <div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
              <FormInput
                control={form.control}
                name='name'
                label='Full name'
                placeholder='Enter full name'
                required
                disabled={isSubmitting}
              />
              <FormInput
                control={form.control}
                name='email'
                type='email'
                label='Email address'
                placeholder='user@techtrust.com.np'
                required
                disabled={isSubmitting}
              />
            </div>

            <div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
              <FormInput
                control={form.control}
                name='username'
                label='Username'
                placeholder='Unique username'
                disabled={isSubmitting}
              />
              <FormSelect
                control={form.control}
                name='role'
                label='Role'
                placeholder='Select role'
                options={ROLE_OPTIONS}
                required
                disabled={isSubmitting}
              />
            </div>

            <FormInput
              control={form.control}
              name='password'
              type='password'
              label='Password'
              placeholder={
                mode === 'create' ? 'Set a password' : 'Leave blank to keep'
              }
              description={
                mode === 'edit'
                  ? 'Leave empty to keep the existing password.'
                  : undefined
              }
              disabled={isSubmitting}
              required={mode === 'create'}
            />

            <FormSwitch
              control={form.control}
              name='isActive'
              className='py-3'
              label='Account status'
              description={
                form.watch('isActive') ? 'User can sign in' : 'User is disabled'
              }
              disabled={isSubmitting}
            />
          </div>

          <DialogFooter className='mt-6'>
            <Button
              type='button'
              variant='outline'
              onClick={handleClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type='submit' disabled={isSubmitting}>
              {isSubmitting
                ? 'Saving...'
                : mode === 'create'
                  ? 'Create user'
                  : 'Save changes'}
            </Button>
          </DialogFooter>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

export default UserModal;

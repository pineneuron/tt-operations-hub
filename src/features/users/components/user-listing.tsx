import { UserTable } from '@/features/users/components/user-tables';
import { columns } from '@/features/users/components/user-tables/columns';
import type { UserListItem } from '@/features/users/types';
import { prisma } from '@/lib/db';
import { searchParamsCache } from '@/lib/searchparams';
import { UserRole, type Prisma } from '@prisma/client';

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 10;

export default async function UserListingPage() {
  const pageParam = searchParamsCache.get('page') ?? DEFAULT_PAGE;
  const limitParam = searchParamsCache.get('perPage') ?? DEFAULT_LIMIT;
  const search = searchParamsCache.get('name');
  const rolesFilter = searchParamsCache.get('role');

  const limit = limitParam > 0 ? limitParam : DEFAULT_LIMIT;
  const page = pageParam > 0 ? pageParam : DEFAULT_PAGE;
  const skip = (page - 1) * limit;

  const roleValues =
    rolesFilter?.split(',').filter(Boolean) ?? ([] as string[]);

  const where: Prisma.UserWhereInput = {};

  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { email: { contains: search, mode: 'insensitive' } },
      { username: { contains: search, mode: 'insensitive' } }
    ];
  }

  if (roleValues.length) {
    where.role = {
      in: roleValues as UserRole[]
    };
  }

  const [users, totalUsers] = await Promise.all([
    prisma.user.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
      select: {
        id: true,
        name: true,
        email: true,
        username: true,
        role: true,
        isActive: true,
        createdAt: true,
        image: true
      }
    }),
    prisma.user.count({ where })
  ]);

  const tableData: UserListItem[] = users.map((user) => ({
    id: user.id,
    name: user.name,
    email: user.email,
    username: user.username,
    role: user.role as UserListItem['role'],
    isActive: user.isActive,
    createdAt: user.createdAt.toISOString(),
    image: user.image
  }));

  return (
    <UserTable data={tableData} totalItems={totalUsers} columns={columns} />
  );
}

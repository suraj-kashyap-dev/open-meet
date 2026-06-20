import { createNavigation } from 'next-intl/navigation';

import { routing } from './routing';

const navigation = createNavigation(routing);

export const Link: typeof navigation.Link = navigation.Link;
export const redirect: typeof navigation.redirect = navigation.redirect;
export const usePathname: typeof navigation.usePathname = navigation.usePathname;
export const useRouter: typeof navigation.useRouter = navigation.useRouter;
export const getPathname: typeof navigation.getPathname = navigation.getPathname;

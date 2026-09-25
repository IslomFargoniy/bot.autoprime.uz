import { Link } from '@inertiajs/react';
import {
    SidebarGroup,
    SidebarGroupLabel,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    useSidebar,
} from '@/components/ui/sidebar';
import { useCurrentUrl } from '@/hooks/use-current-url';
import type { NavGroup, NavItem } from '@/types';

interface NavMainProps {
    items?: NavItem[];
    groups?: NavGroup[];
}

export function NavMain({ items, groups }: NavMainProps) {
    const { isCurrentUrl } = useCurrentUrl();
    const { setOpenMobile, isMobile } = useSidebar();

    const handleNavClick = () => {
        if (isMobile) {
            setOpenMobile(false);
        }
    };

    const effectiveGroups: NavGroup[] = groups || (items ? [{ items }] : []);

    return (
        <div className="space-y-1">
            {effectiveGroups.map((group, groupIdx) => {
                if (!group.items || group.items.length === 0) return null;

                return (
                    <SidebarGroup key={group.title || groupIdx} className="px-2 py-1">
                        {group.title && (
                            <SidebarGroupLabel className="text-[10px] font-bold tracking-wider uppercase text-muted-foreground/70 px-2 py-1">
                                {group.title}
                            </SidebarGroupLabel>
                        )}
                        <SidebarMenu>
                            {group.items.map((item) => (
                                <SidebarMenuItem key={item.title}>
                                    <SidebarMenuButton
                                        asChild
                                        isActive={isCurrentUrl(item.href)}
                                        tooltip={{ children: item.title }}
                                    >
                                        <Link href={item.href} onClick={handleNavClick}>
                                            {item.icon && <item.icon />}
                                            <span>{item.title}</span>
                                        </Link>
                                    </SidebarMenuButton>
                                </SidebarMenuItem>
                            ))}
                        </SidebarMenu>
                    </SidebarGroup>
                );
            })}
        </div>
    );
}



"use client"

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useAuth, useUser } from "@/firebase"
import { MessageSquare, Settings, LogOut } from "lucide-react"
import Link from "next/link"
import { signOut } from "firebase/auth"
import { useData } from "./providers/data-provider"


export function UserNav() {
  const { user, isUserLoading } = useUser();
  const auth = useAuth();
  const { isAdmin } = useData();

  const handleLogout = () => {
    signOut(auth);
  };
  
  if (isUserLoading) {
    return (
        <Button variant="ghost" className="relative h-8 w-8 rounded-full" disabled>
            <Avatar className="h-9 w-9">
                <AvatarFallback></AvatarFallback>
            </Avatar>
        </Button>
    )
  }


  if (!user) {
    return (
      <Button asChild>
        <Link href="/login">Login</Link>
      </Button>
    )
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-8 w-8 rounded-full">
          <Avatar className="h-9 w-9">
            <AvatarImage src={user.photoURL || `https://picsum.photos/seed/${user.uid}/100/100`} alt={user.displayName || ""} />
            <AvatarFallback>{user.email?.charAt(0).toUpperCase()}</AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">{user.displayName || user.email?.split('@')[0]}</p>
            <p className="text-xs leading-none text-muted-foreground">
              {user.email}
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <Link href="/profile">
            <DropdownMenuItem>
              <MessageSquare className="mr-2 h-4 w-4" />
              <span>My Comments</span>
            </DropdownMenuItem>
          </Link>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        {isAdmin && (
            <>
                <Link href="/admin">
                    <DropdownMenuItem>
                        <Settings className="mr-2 h-4 w-4" />
                        <span>Admin Panel</span>
                    </DropdownMenuItem>
                </Link>
                <DropdownMenuSeparator />
            </>
        )}
        <DropdownMenuItem onClick={handleLogout}>
            <LogOut className="mr-2 h-4 w-4" />
            <span>Log out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

    
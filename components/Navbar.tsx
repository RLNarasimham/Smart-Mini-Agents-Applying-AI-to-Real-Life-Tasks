import React, { useState } from 'react';
import { Button } from './ui/button';
import { Avatar, AvatarFallback } from './ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from './ui/dropdown-menu';
import { Bell, Moon, Sun, Menu, LogOut, UserPlus, Shield } from 'lucide-react';
import { useTheme } from './ThemeProvider';
import { MobileAppPreview } from './MobileAppPreview';
import { ShiningStars } from './ShiningStars';

interface NavbarProps {
  onToggleSidebar: () => void;
  onToggleAppPreview: () => void;
  showAppPreview: boolean;
  onLogout: () => void;
}

export function Navbar({ onToggleSidebar, onToggleAppPreview, showAppPreview, onLogout }: NavbarProps) {
  const { theme, toggleTheme } = useTheme();
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);

  return (
    <div className="h-16 bg-background border-b border-border flex items-center justify-between px-6">
      {/* Left side */}
      <div className="flex items-center space-x-6">
        {/* Menu button for sidebar toggle */}
        <button 
          onClick={onToggleSidebar}
          className="p-2 hover:bg-muted/50 rounded-lg transition-colors lg:hidden"
        >
          <Menu className="w-5 h-5 text-foreground/70" />
        </button>
        
        {/* Logo for desktop - clicking toggles sidebar with Shining Stars */}
        <button 
          onClick={onToggleSidebar}
          className="hidden lg:flex items-center space-x-3 hover:opacity-80 transition-opacity"
        >
          <ShiningStars size="small" count={15} />
          <span className="font-medium">
            Nava <span className="text-primary">AI</span>
          </span>
        </button>
        
        <button 
          onClick={onToggleAppPreview}
          className="text-foreground hover:text-[#7B61FF] transition-colors"
        >
          App
        </button>
        <button className="text-foreground hover:text-[#7B61FF] transition-colors">
          Upgrade
        </button>
      </div>

      {/* Right side */}
      <div className="flex items-center space-x-4">
        {/* Upgrade button */}
        <Button className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white px-4 py-2 rounded-lg transition-all duration-200">
          Upgrade
        </Button>

        {/* Notifications */}
        <button className="p-2 hover:bg-muted/50 rounded-lg transition-colors">
          <Bell className="w-5 h-5 text-foreground/70" />
        </button>

        {/* Theme toggle */}
        <button 
          onClick={toggleTheme}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              toggleTheme();
            }
          }}
          className="p-2 hover:bg-muted/50 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-primary/50"
          aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
        >
          {theme === 'light' ? (
            <Moon className="w-5 h-5 text-foreground/70" />
          ) : (
            <Sun className="w-5 h-5 text-foreground/70" />
          )}
        </button>

        {/* Profile with dropdown */}
        <DropdownMenu open={userDropdownOpen} onOpenChange={setUserDropdownOpen}>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center space-x-3 hover:bg-muted/50 rounded-lg p-2 transition-colors">
              <Avatar className="w-8 h-8">
                <AvatarFallback className="bg-gradient-to-r from-[#7B61FF] to-[#9F7AEA] text-white text-sm">
                  YK
                </AvatarFallback>
              </Avatar>
              <div className="hidden sm:block">
                <div className="text-sm font-medium">Yeswanth Kosuri</div>
              </div>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 bg-card/95 backdrop-blur-xl">
            <div className="px-3 py-2">
              <p className="text-sm font-medium">Yeswanth Kosuri</p>
              <p className="text-xs text-muted-foreground">yeswanth@example.com</p>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="cursor-pointer hover:bg-muted/50">
              <UserPlus className="w-4 h-4 mr-2" />
              Switch Account
            </DropdownMenuItem>
            <DropdownMenuItem className="cursor-pointer hover:bg-muted/50">
              <Shield className="w-4 h-4 mr-2" />
              Account Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              className="cursor-pointer hover:bg-destructive/10 text-destructive"
              onClick={onLogout}
            >
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      
      {/* Mobile App Preview Modal */}
      <MobileAppPreview isOpen={showAppPreview} onClose={onToggleAppPreview} />
    </div>
  );
}
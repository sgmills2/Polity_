import { ReactNode } from 'react';
import { Link as RouterLink, useLocation } from 'react-router-dom';
import {
  Box,
  Sheet,
  List,
  ListItem,
  ListItemButton,
  ListItemContent,
  Typography,
} from '@mui/joy';

interface LayoutProps {
  children: ReactNode;
}

const navItems = [
  { path: '/', label: 'Home' },
  { path: '/politicians', label: 'Politicians' },
  { path: '/spectrum', label: 'Political Spectrum', isSpecial: true },
];

export default function Layout({ children }: LayoutProps) {
  const location = useLocation();

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      {/* Sidebar */}
      <Sheet
        sx={{
          width: 240,
          p: 2,
          borderRight: '1px solid',
          borderColor: 'divider',
        }}
      >
        <Typography level="h4" component={RouterLink} to="/" sx={{ textDecoration: 'none', color: 'inherit', mb: 2, display: 'block' }}>
          Polity
        </Typography>
        <List size="sm" sx={{ '--ListItem-radius': '8px' }}>
          {navItems.map((item) => (
            <ListItem key={item.path}>
              <ListItemButton
                component={RouterLink}
                to={item.path}
                selected={location.pathname === item.path}
                sx={item.isSpecial ? {
                  position: 'relative',
                  overflow: 'hidden',
                  '&:hover': {
                    background: 'linear-gradient(45deg, #ff0000, #ff7f00, #ffff00, #00ff00, #0000ff, #4b0082, #9400d3)',
                    backgroundSize: '400% 400%',
                    animation: 'rainbow 2s ease infinite',
                    color: 'white',
                    '& .MuiListItemContent-root': {
                      color: 'white',
                    }
                  },
                  '@keyframes rainbow': {
                    '0%': { backgroundPosition: '0% 50%' },
                    '50%': { backgroundPosition: '100% 50%' },
                    '100%': { backgroundPosition: '0% 50%' },
                  }
                } : {}}
              >
                <ListItemContent>
                  {item.label}
                </ListItemContent>
              </ListItemButton>
            </ListItem>
          ))}
        </List>
      </Sheet>

      {/* Main content */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 2,
        }}
      >
        {children}
      </Box>
    </Box>
  );
} 
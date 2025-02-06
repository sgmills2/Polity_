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
  IconButton,
} from '@mui/joy';

interface LayoutProps {
  children: ReactNode;
}

const navItems = [
  { path: '/', label: 'Home' },
  { path: '/politicians', label: 'Politicians' },
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
              >
                <ListItemContent>{item.label}</ListItemContent>
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
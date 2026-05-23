import type { ThemeOptions } from '@mui/material/styles';
import { createTheme } from '@mui/material/styles';

// Enterprise color palette
const PRIMARY_COLOR = '#1976D2';
const SECONDARY_COLOR = '#424242';
const SUCCESS_COLOR = '#4CAF50';
const ERROR_COLOR = '#F44336';
const WARNING_COLOR = '#FFA726';
const INFO_COLOR = '#29B6F6';
const BACKGROUND_COLOR = '#F5F7FA';
const SURFACE_COLOR = '#FFFFFF';
const TEXT_PRIMARY = '#212121';
const TEXT_SECONDARY = '#757575';
const BORDER_COLOR = '#E0E0E0';

const themeConfig: ThemeOptions = {
  palette: {
    mode: 'light',
    primary: {
      main: PRIMARY_COLOR,
      light: '#42A5F5',
      dark: '#1565C0',
      contrastText: '#FFFFFF',
    },
    secondary: {
      main: SECONDARY_COLOR,
      light: '#616161',
      dark: '#212121',
      contrastText: '#FFFFFF',
    },
    success: {
      main: SUCCESS_COLOR,
      light: '#81C784',
      dark: '#388E3C',
    },
    error: {
      main: ERROR_COLOR,
      light: '#EF5350',
      dark: '#D32F2F',
    },
    warning: {
      main: WARNING_COLOR,
      light: '#FFB74D',
      dark: '#F57C00',
    },
    info: {
      main: INFO_COLOR,
      light: '#4FC3F7',
      dark: '#0288D1',
    },
    background: {
      default: BACKGROUND_COLOR,
      paper: SURFACE_COLOR,
    },
    text: {
      primary: TEXT_PRIMARY,
      secondary: TEXT_SECONDARY,
    },
    divider: BORDER_COLOR,
  },
  typography: {
    fontFamily: [
      '-apple-system',
      'BlinkMacSystemFont',
      '"Segoe UI"',
      'Roboto',
      '"Helvetica Neue"',
      'Arial',
      'sans-serif',
      '"Apple Color Emoji"',
      '"Segoe UI Emoji"',
      '"Segoe UI Symbol"',
    ].join(','),
    h1: {
      fontSize: '2.5rem',
      fontWeight: 700,
      lineHeight: 1.2,
      letterSpacing: '-0.5px',
    },
    h2: {
      fontSize: '2rem',
      fontWeight: 700,
      lineHeight: 1.3,
      letterSpacing: '-0.25px',
    },
    h3: {
      fontSize: '1.75rem',
      fontWeight: 600,
      lineHeight: 1.4,
    },
    h4: {
      fontSize: '1.5rem',
      fontWeight: 600,
      lineHeight: 1.4,
    },
    h5: {
      fontSize: '1.25rem',
      fontWeight: 600,
      lineHeight: 1.5,
    },
    h6: {
      fontSize: '1rem',
      fontWeight: 600,
      lineHeight: 1.6,
      letterSpacing: '0.15px',
    },
    subtitle1: {
      fontSize: '1rem',
      fontWeight: 500,
      lineHeight: 1.75,
      letterSpacing: '0.15px',
    },
    subtitle2: {
      fontSize: '0.875rem',
      fontWeight: 500,
      lineHeight: 1.57,
      letterSpacing: '0.1px',
    },
    body1: {
      fontSize: '1rem',
      fontWeight: 400,
      lineHeight: 1.5,
      letterSpacing: '0.5px',
    },
    body2: {
      fontSize: '0.875rem',
      fontWeight: 400,
      lineHeight: 1.43,
      letterSpacing: '0.25px',
    },
    button: {
      fontSize: '0.875rem',
      fontWeight: 600,
      lineHeight: 1.75,
      letterSpacing: '0.46px',
      textTransform: 'none',
    },
    caption: {
      fontSize: '0.75rem',
      fontWeight: 500,
      lineHeight: 1.66,
      letterSpacing: '0.4px',
    },
  },
  components: {
    // AppBar
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: SURFACE_COLOR,
          color: TEXT_PRIMARY,
          boxShadow: `0 1px 3px rgba(0, 0, 0, 0.08)`,
          borderBottom: `1px solid ${BORDER_COLOR}`,
        },
      },
    },
    // Drawer
    MuiDrawer: {
      styleOverrides: {
        paper: {
          backgroundColor: SURFACE_COLOR,
          borderRight: `1px solid ${BORDER_COLOR}`,
        },
      },
    },
    // Cards
    MuiCard: {
      styleOverrides: {
        root: {
          backgroundColor: SURFACE_COLOR,
          border: `1px solid ${BORDER_COLOR}`,
          boxShadow: `0 1px 3px rgba(0, 0, 0, 0.08)`,
        },
      },
    },
    MuiCardContent: {
      styleOverrides: {
        root: {
          padding: '20px',
          '&:last-child': {
            paddingBottom: '20px',
          },
        },
      },
    },
    // Buttons
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: '6px',
          textTransform: 'none',
          fontWeight: 500,
          padding: '8px 16px',
          fontSize: '0.875rem',
        },
        contained: {
          boxShadow: 'none',
        },
      },
    },
    // Text Fields
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: '6px',
            backgroundColor: BACKGROUND_COLOR,
            '& fieldset': {
              borderColor: BORDER_COLOR,
            },
          },
        },
      },
    },
    // Select
    MuiSelect: {
      styleOverrides: {
        root: {
          borderRadius: '6px',
          backgroundColor: BACKGROUND_COLOR,
        },
      },
    },
    // Table
    MuiTable: {
      styleOverrides: {
        root: {
          borderCollapse: 'separate',
          borderSpacing: '0 8px',
        },
      },
    },
    MuiTableHead: {
      styleOverrides: {
        root: {
          backgroundColor: BACKGROUND_COLOR,
          '& .MuiTableCell-root': {
            fontWeight: 600,
            fontSize: '0.875rem',
            color: TEXT_PRIMARY,
            borderBottom: `2px solid ${BORDER_COLOR}`,
            padding: '12px 16px',
            backgroundColor: BACKGROUND_COLOR,
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
          },
        },
      },
    },
    MuiTableBody: {
      styleOverrides: {
        root: {
          '& .MuiTableRow-root': {
            '&:hover': {
              backgroundColor: `${PRIMARY_COLOR}04`,
            },
          },
          '& .MuiTableCell-root': {
            borderBottom: `1px solid ${BORDER_COLOR}`,
            padding: '14px 16px',
            fontSize: '0.875rem',
          },
        },
      },
    },
    // Chips
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: '4px',
          fontWeight: 500,
          fontSize: '0.75rem',
        },
        filled: {
          backgroundColor: `${PRIMARY_COLOR}12`,
          color: PRIMARY_COLOR,
        },
        outlined: {
          borderColor: BORDER_COLOR,
        },
      },
    },
    // Dialog
    MuiDialog: {
      styleOverrides: {
        paper: {
          borderRadius: '8px',
          boxShadow: `0 10px 40px rgba(0, 0, 0, 0.16)`,
        },
      },
    },
    MuiDialogTitle: {
      styleOverrides: {
        root: {
          fontSize: '1.25rem',
          fontWeight: 600,
          padding: '24px',
          borderBottom: `1px solid ${BORDER_COLOR}`,
        },
      },
    },
    MuiDialogContent: {
      styleOverrides: {
        root: {
          padding: '24px',
        },
      },
    },
    MuiDialogActions: {
      styleOverrides: {
        root: {
          padding: '16px 24px',
          borderTop: `1px solid ${BORDER_COLOR}`,
        },
      },
    },
    // ListItemButton
    MuiListItemButton: {
      styleOverrides: {
        root: {
          borderRadius: '6px',
          margin: '4px 0',
          '&.Mui-selected': {
            backgroundColor: `${PRIMARY_COLOR}12`,
            color: PRIMARY_COLOR,
            '& .MuiListItemIcon-root': {
              color: PRIMARY_COLOR,
            },
          },
        },
      },
    },
    // Checkbox
    MuiCheckbox: {
      styleOverrides: {
        root: {
          borderRadius: '4px',
        },
      },
    },
    // CircularProgress
    MuiCircularProgress: {
      styleOverrides: {
        root: {
          color: PRIMARY_COLOR,
        },
      },
    },
    // Divider
    MuiDivider: {
      styleOverrides: {
        root: {
          borderColor: BORDER_COLOR,
        },
      },
    },
  },
};

export const theme = createTheme(themeConfig);

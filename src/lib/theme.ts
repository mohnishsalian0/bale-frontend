/**
 * Design System Theme Configuration
 * Based on Figma design system variables
 * @see https://www.figma.com/design/3J4DSdgb7iTzhOKuFw1bmM/Sukh
 */

export const colors = {
  // Grayscale
  gray: {
    50: '#FAFAFA',
    100: '#F5F5F5',
    200: '#E5E5E5',
    300: '#D4D4D4',
    400: '#A3A3A3',
    500: '#667085',
    600: '#525252',
    700: '#344054',
    800: '#262626',
    900: '#101828',
  },

  // Primary - Blue Light
  primary: {
    25: '#F5FBFF',
    50: '#F0F9FF',
    100: '#E0F2FE',
    200: '#C9E4F2',
    300: '#B3D2E3',
    400: '#8EBBD4',
    500: '#67A6C7',
    600: '#3588B5',
    700: '#026AA2',
    800: '#065986',
    900: '#0B4A6F',
  },

  // Background
  background: {
    100: '#FEFBF4',
  },

  // Base colors
  base: {
    white: '#FFFFFF',
    black: '#000000',
  },
} as const;

export const typography = {
  fontFamily: {
    base: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  },

  // Display styles
  display: {
    '2xl': {
      regular: {
        fontSize: '72px',
        lineHeight: '90px',
        fontWeight: 400,
      },
      medium: {
        fontSize: '72px',
        lineHeight: '90px',
        fontWeight: 500,
      },
      semibold: {
        fontSize: '72px',
        lineHeight: '90px',
        fontWeight: 600,
      },
      bold: {
        fontSize: '72px',
        lineHeight: '90px',
        fontWeight: 700,
      },
    },
    xl: {
      regular: {
        fontSize: '60px',
        lineHeight: '72px',
        fontWeight: 400,
      },
      medium: {
        fontSize: '60px',
        lineHeight: '72px',
        fontWeight: 500,
      },
      semibold: {
        fontSize: '60px',
        lineHeight: '72px',
        fontWeight: 600,
      },
      bold: {
        fontSize: '60px',
        lineHeight: '72px',
        fontWeight: 700,
      },
    },
    lg: {
      regular: {
        fontSize: '48px',
        lineHeight: '60px',
        fontWeight: 400,
      },
      medium: {
        fontSize: '48px',
        lineHeight: '60px',
        fontWeight: 500,
      },
      semibold: {
        fontSize: '48px',
        lineHeight: '60px',
        fontWeight: 600,
      },
      bold: {
        fontSize: '48px',
        lineHeight: '60px',
        fontWeight: 700,
      },
    },
    md: {
      regular: {
        fontSize: '36px',
        lineHeight: '44px',
        fontWeight: 400,
      },
      medium: {
        fontSize: '36px',
        lineHeight: '44px',
        fontWeight: 500,
      },
      semibold: {
        fontSize: '36px',
        lineHeight: '44px',
        fontWeight: 600,
      },
      bold: {
        fontSize: '36px',
        lineHeight: '44px',
        fontWeight: 700,
      },
    },
    sm: {
      regular: {
        fontSize: '30px',
        lineHeight: '38px',
        fontWeight: 400,
      },
      medium: {
        fontSize: '30px',
        lineHeight: '38px',
        fontWeight: 500,
      },
      semibold: {
        fontSize: '30px',
        lineHeight: '38px',
        fontWeight: 600,
      },
      bold: {
        fontSize: '30px',
        lineHeight: '38px',
        fontWeight: 700,
      },
    },
    xs: {
      regular: {
        fontSize: '24px',
        lineHeight: '32px',
        fontWeight: 400,
      },
      medium: {
        fontSize: '24px',
        lineHeight: '32px',
        fontWeight: 500,
      },
      semibold: {
        fontSize: '24px',
        lineHeight: '32px',
        fontWeight: 600,
      },
      bold: {
        fontSize: '24px',
        lineHeight: '32px',
        fontWeight: 700,
      },
    },
  },

  // Text styles
  text: {
    xl: {
      regular: {
        fontSize: '20px',
        lineHeight: '30px',
        fontWeight: 400,
      },
      medium: {
        fontSize: '20px',
        lineHeight: '30px',
        fontWeight: 500,
      },
      semibold: {
        fontSize: '20px',
        lineHeight: '30px',
        fontWeight: 600,
      },
      bold: {
        fontSize: '20px',
        lineHeight: '30px',
        fontWeight: 700,
      },
    },
    lg: {
      regular: {
        fontSize: '18px',
        lineHeight: '28px',
        fontWeight: 400,
      },
      medium: {
        fontSize: '18px',
        lineHeight: '28px',
        fontWeight: 500,
      },
      semibold: {
        fontSize: '18px',
        lineHeight: '28px',
        fontWeight: 600,
      },
      bold: {
        fontSize: '18px',
        lineHeight: '28px',
        fontWeight: 700,
      },
    },
    md: {
      regular: {
        fontSize: '16px',
        lineHeight: '24px',
        fontWeight: 400,
      },
      medium: {
        fontSize: '16px',
        lineHeight: '24px',
        fontWeight: 500,
      },
      semibold: {
        fontSize: '16px',
        lineHeight: '24px',
        fontWeight: 600,
      },
      bold: {
        fontSize: '16px',
        lineHeight: '24px',
        fontWeight: 700,
      },
    },
    sm: {
      regular: {
        fontSize: '14px',
        lineHeight: '20px',
        fontWeight: 400,
      },
      medium: {
        fontSize: '14px',
        lineHeight: '20px',
        fontWeight: 500,
      },
      semibold: {
        fontSize: '14px',
        lineHeight: '20px',
        fontWeight: 600,
      },
      bold: {
        fontSize: '14px',
        lineHeight: '20px',
        fontWeight: 700,
      },
    },
    xs: {
      regular: {
        fontSize: '12px',
        lineHeight: '18px',
        fontWeight: 400,
      },
      medium: {
        fontSize: '12px',
        lineHeight: '18px',
        fontWeight: 500,
      },
      semibold: {
        fontSize: '12px',
        lineHeight: '18px',
        fontWeight: 600,
      },
      bold: {
        fontSize: '12px',
        lineHeight: '18px',
        fontWeight: 700,
      },
    },
  },
} as const;

export const breakpoints = {
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  '2xl': '1536px',
} as const;

// Type exports for TypeScript support
export type Colors = typeof colors;
export type Typography = typeof typography;
export type Breakpoints = typeof breakpoints;

export const theme = {
  colors,
  typography,
  breakpoints,
} as const;

export default theme;

# AmbiEye Complete UI Redesign Guide

## Overview
This document outlines the complete UI redesign for the AmbiEye app with a fresh, modern color scheme and improved navigation.

## New Color Scheme

### Primary Colors
- **Primary Blue**: `#0EA5E9` (Sky Blue) - Main brand color
- **Secondary Purple**: `#8B5CF6` - Secondary actions
- **Accent Green**: `#10B981` - Success states

### Background Colors
- **Background**: `#F8FAFC` - Light gray background
- **Surface**: `#FFFFFF` - Card backgrounds
- **Dark Background**: `#0F172A` - Headers and dark sections

### Text Colors
- **Primary Text**: `#0F172A` - Main text
- **Secondary Text**: `#64748B` - Supporting text
- **Light Text**: `#94A3B8` - Disabled/placeholder text

## Key Changes

### 1. Navigation Fixes
**Problem**: Back buttons don't work, bottom nav hidden on some screens

**Solution**:
- Replace all `router.push("/games")` with `router.back()`
- Remove `tabBarStyle: { display: 'none' }` from tab screens
- Add consistent back button component across all screens

### 2. Bottom Navigation
**Current**: Hidden on home and games screens
**New**: Always visible with modern design
- Floating tab bar with rounded corners
- Active state with background highlight
- Consistent across all tab screens

### 3. Header Design
**Old**: Dark purple (#1A0A5E) headers
**New**: Modern gradient headers with:
- Primary blue gradient background
- Better spacing and typography
- Consistent back button placement

### 4. Card Design
**Old**: Simple white cards with basic shadows
**New**: Modern cards with:
- Larger border radius (16-20px)
- Subtle shadows
- Hover/press states
- Better spacing

### 5. Button Design
**Old**: Pink (#E8447A) buttons
**New**: Blue gradient buttons with:
- Primary: Sky blue (#0EA5E9)
- Secondary: Purple (#8B5CF6)
- Better press states
- Consistent sizing

## File Changes Required

### Core Files (Already Updated)
✅ `constants/theme.ts` - New theme constants
✅ `app/splash.tsx` - Redesigned splash screen
✅ `app/user-type.tsx` - Redesigned user type selection

### Auth Screens (Need Update)
- `app/auth/login.tsx`
- `app/auth/signup.tsx`
- `app/auth/privacy.tsx`

### Patient Screens (Need Update)
- `app/(patient)/_layout.tsx` - Fix bottom nav
- `app/(patient)/index.tsx` - Redesign home
- `app/(patient)/games.tsx` - Redesign games list
- `app/(patient)/queries.tsx` - Redesign queries
- `app/(patient)/settings.tsx` - Redesign settings

### Doctor Screens (Need Update)
- `app/(doctor)/_layout.tsx` - Fix bottom nav
- `app/(doctor)/index.tsx` - Redesign dashboard
- `app/(doctor)/patients.tsx` - Redesign patients list
- `app/(doctor)/queries.tsx` - Redesign queries
- `app/(doctor)/settings.tsx` - Redesign settings

### Game Screens (Need Update - 12 games)
All game screens need:
1. Replace `router.push("/games")` with `router.back()`
2. Update color scheme
3. Modern UI components
4. Better feedback animations

**Identify Games** (5 screens):
- `colored-balls.tsx`
- `alphabet.tsx`
- `alphabet-objects.tsx`
- `symbol.tsx`
- `object-color.tsx`

**Movement Games** (4 screens):
- `clockwise.tsx`
- `anti-clockwise.tsx`
- `eyeball.tsx`
- `target-direction.tsx`

**Cognitive Games** (3 screens):
- `find-characters.tsx`
- `count.tsx`
- `matching.tsx`

## Implementation Priority

### Phase 1: Core Navigation (CRITICAL)
1. Fix back buttons in all game screens
2. Fix bottom navigation visibility
3. Update tab layouts

### Phase 2: Auth & Onboarding
1. Login screen
2. Signup screen
3. Privacy policy

### Phase 3: Main Screens
1. Patient home
2. Doctor dashboard
3. Games list
4. Settings screens

### Phase 4: Game Screens
1. Update all 12 game screens
2. Consistent UI across games
3. Better feedback and animations

### Phase 5: Polish
1. Animations and transitions
2. Loading states
3. Error states
4. Empty states

## Quick Fixes for Immediate Issues

### Fix Back Buttons (All Game Screens)
```typescript
// OLD
<TouchableOpacity onPress={() => router.push("/games")}>
  <FontAwesome name="arrow-left" size={24} color="#E8447A" />
</TouchableOpacity>

// NEW
<TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
  <Feather name="arrow-left" size={20} color={Colors.primary} />
</TouchableOpacity>
```

### Fix Bottom Navigation
```typescript
// In (patient)/_layout.tsx and (doctor)/_layout.tsx
// REMOVE this from tab screens:
tabBarStyle: { display: 'none' }

// UPDATE to:
tabBarStyle: {
  position: "absolute",
  bottom: 0,
  backgroundColor: Colors.surface,
  borderTopWidth: 0,
  height: Platform.OS === "ios" ? 88 : 68,
  paddingBottom: Platform.OS === "ios" ? 28 : 12,
  paddingTop: 12,
  ...Shadows.lg,
  borderTopLeftRadius: 24,
  borderTopRightRadius: 24,
}
```

### Update Color References
Find and replace across all files:
- `#0D0145` → `#0F172A` (dark background)
- `#1A0A5E` → `#0F172A` (dark background)
- `#E8447A` → `#0EA5E9` (primary color)
- `#5f2446` → `#0284C7` (primary dark)

## Component Library Needed

Create reusable components:
1. `BackButton.tsx` - Consistent back button
2. `Card.tsx` - Modern card component
3. `Button.tsx` - Primary/secondary buttons
4. `Header.tsx` - Screen headers
5. `TabBar.tsx` - Custom tab bar
6. `GameCard.tsx` - Game list item
7. `PatientCard.tsx` - Patient list item
8. `QueryCard.tsx` - Query list item

## Testing Checklist

- [ ] All back buttons work correctly
- [ ] Bottom navigation visible on all tab screens
- [ ] Colors consistent across app
- [ ] All games playable and save results
- [ ] Navigation flows work end-to-end
- [ ] No broken layouts on different screen sizes
- [ ] Animations smooth and performant
- [ ] Loading states work correctly
- [ ] Error handling works

## Notes

- This is a comprehensive redesign affecting 50+ files
- Prioritize navigation fixes first (critical for usability)
- Test thoroughly after each phase
- Consider creating a design system document
- May want to use a component library like React Native Paper or NativeBase for consistency

## Next Steps

1. Review and approve new color scheme
2. Create reusable component library
3. Update screens in priority order
4. Test navigation flows
5. Polish animations and transitions

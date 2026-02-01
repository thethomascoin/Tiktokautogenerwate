# TikTok Shop UGC Automation - Mobile App Design

## App Overview
A mobile app that automates the creation and posting of UGC-style product videos for TikTok Shop. Users input a product URL, and the app generates a professional video with AI, then posts it directly to their TikTok account with optimized captions and hashtags.

## Design Philosophy
- **Mobile-first**: Designed for portrait orientation (9:16) and one-handed usage
- **iOS HIG compliant**: Follows Apple Human Interface Guidelines for native feel
- **Automation-focused**: Minimize user input, maximize automation
- **Progress transparency**: Clear feedback on each automation step

## Color Scheme
- **Primary**: #FF0050 (TikTok pink/red) - Action buttons, active states
- **Secondary**: #00F2EA (TikTok cyan) - Accents, progress indicators
- **Background**: #FFFFFF (light) / #121212 (dark)
- **Surface**: #F5F5F5 (light) / #1E1E1E (dark) - Cards, elevated elements
- **Success**: #00D95F - Completion states
- **Warning**: #FFA500 - Processing states
- **Error**: #FF3B30 - Error states

## Screen List

### 1. Home Screen (Main Entry Point)
**Purpose**: Primary action screen for starting automation

**Content**:
- App logo and title at top
- Large "Create Video" button (primary CTA)
- Recent videos list (thumbnail, status, timestamp)
- TikTok connection status indicator

**Functionality**:
- Tap "Create Video" → Navigate to Product Input screen
- Tap recent video → View video details
- Tap TikTok status → Connect/reconnect account

**Layout**:
- Header: Logo + TikTok connection badge
- Hero section: Large CTA button with icon
- List section: Scrollable recent videos (3-5 visible)

### 2. Product Input Screen
**Purpose**: Capture TikTok Shop product URL

**Content**:
- Text input field for product URL
- Paste button (auto-detect clipboard)
- Example URL hint text
- "Analyze Product" button (disabled until valid URL)

**Functionality**:
- Auto-validate URL format
- Detect TikTok Shop URLs from clipboard
- Tap "Analyze Product" → Navigate to Generation screen

**Layout**:
- Centered input field with large touch target
- Helper text below input
- Bottom-aligned action button

### 3. Generation Screen (Processing)
**Purpose**: Show automation progress with transparency

**Content**:
- Product preview card (image, name, price)
- Progress steps with animated indicators:
  1. Analyzing product details
  2. Generating video script
  3. Creating video with AI
  4. Generating thumbnail
  5. Creating viral hashtags
  6. Posting to TikTok
- Current step highlighted with animation
- Cancel button (top-right)

**Functionality**:
- Real-time progress updates
- Show estimated time remaining
- Handle errors gracefully with retry option
- On completion → Navigate to Success screen

**Layout**:
- Product card at top (compact)
- Vertical progress list (center)
- Status text below each step
- Cancel button in header

### 4. Success Screen
**Purpose**: Confirm successful posting and show results

**Content**:
- Success checkmark animation
- Video preview (thumbnail + play button)
- Generated caption with hashtags
- "View on TikTok" button
- "Create Another" button
- Share button

**Functionality**:
- Tap video → Play preview
- Tap "View on TikTok" → Open TikTok app
- Tap "Create Another" → Return to Product Input
- Tap Share → Native share sheet

**Layout**:
- Centered success icon
- Video preview card (16:9 or 9:16)
- Caption text (scrollable if long)
- Action buttons at bottom

### 5. Settings Screen
**Purpose**: Manage app configuration and connections

**Content**:
- TikTok Account section:
  - Connected account info (avatar, username)
  - Disconnect button
- API Keys section:
  - Hugging Face token input
  - TikTok app credentials (client_id, client_secret)
  - Visibility toggle (show/hide)
- Video Settings section:
  - Video length (5s, 8s, 10s)
  - Video quality (Fast, Balanced, High)
  - Model selection dropdown
- Privacy settings:
  - Default privacy level (Public, Friends, Private)
  - Enable comments, duets, stitches

**Functionality**:
- Save settings to AsyncStorage
- Validate API tokens
- Test connection buttons
- Reset to defaults option

**Layout**:
- Grouped list sections
- Form fields with labels
- Toggle switches for booleans
- Segmented controls for options

### 6. Video History Screen
**Purpose**: Browse all generated videos

**Content**:
- Grid of video thumbnails
- Status badges (Posted, Failed, Draft)
- Tap to view details

**Functionality**:
- Filter by status
- Search by product name
- Delete videos
- Retry failed posts

**Layout**:
- 2-column grid
- Filter tabs at top
- Pull-to-refresh

### 7. TikTok OAuth Screen
**Purpose**: Handle TikTok authentication flow

**Content**:
- WebView for TikTok OAuth
- Loading indicator
- Error handling

**Functionality**:
- Handle OAuth callback
- Store access token securely
- Return to previous screen on success

**Layout**:
- Full-screen WebView
- Loading overlay

## Key User Flows

### Flow 1: First-Time Setup
1. Open app → Home screen
2. Tap "Connect TikTok" → OAuth screen
3. Authorize app → Return to Home
4. Tap Settings → Enter API keys
5. Save settings → Ready to create

### Flow 2: Create Video (Happy Path)
1. Home screen → Tap "Create Video"
2. Product Input → Paste URL → Tap "Analyze"
3. Generation screen → Watch progress (2-5 minutes)
4. Success screen → View results
5. Tap "View on TikTok" → Opens TikTok app
6. Tap "Create Another" → Return to Product Input

### Flow 3: Handle Error
1. Generation screen → Error occurs
2. Show error message with details
3. Offer "Retry" or "Cancel" options
4. If retry → Resume from failed step
5. If cancel → Return to Home with draft saved

### Flow 4: View History
1. Home screen → Tap "History" tab
2. Video History screen → Browse grid
3. Tap video → Video Details screen
4. Options: View on TikTok, Delete, Retry

## Component Design

### Video Card Component
- Thumbnail image (16:9 aspect ratio)
- Status badge (top-right corner)
- Product name (bottom overlay)
- Timestamp (small text)
- Tap area (full card)

### Progress Step Component
- Icon (checkmark, spinner, or pending)
- Step title (bold)
- Status text (gray, below title)
- Animated transition between states

### Connection Badge Component
- TikTok logo icon
- Status text ("Connected" / "Not Connected")
- Colored background (success green / gray)
- Tap to manage connection

## Interaction Design

### Button States
- **Primary Button**: 
  - Default: Solid primary color, white text
  - Pressed: Scale 0.97, opacity 0.9, haptic light
  - Disabled: Gray background, gray text
  
- **Secondary Button**:
  - Default: Outlined, primary color text
  - Pressed: Background primary color (10% opacity)
  
- **Icon Button**:
  - Default: Icon only
  - Pressed: Opacity 0.6

### Loading States
- Skeleton screens for initial loads
- Inline spinners for actions
- Progress bars for multi-step processes
- Shimmer effect for loading cards

### Error States
- Toast notifications for minor errors
- Modal alerts for critical errors
- Inline error text for form validation
- Retry buttons for recoverable errors

## Typography
- **Headings**: SF Pro Display (iOS), Roboto (Android)
- **Body**: SF Pro Text (iOS), Roboto (Android)
- **Sizes**:
  - H1: 34px (bold) - Screen titles
  - H2: 28px (bold) - Section headers
  - H3: 22px (semibold) - Card titles
  - Body: 17px (regular) - Main content
  - Caption: 13px (regular) - Helper text

## Spacing System
- **Base unit**: 4px
- **Common values**: 8px, 12px, 16px, 24px, 32px
- **Screen padding**: 16px horizontal
- **Card spacing**: 12px between cards
- **Section spacing**: 24px between sections

## Animation Guidelines
- **Duration**: 200-300ms for interactions
- **Easing**: Ease-out for entrances, ease-in for exits
- **Scale**: 0.97 for button press
- **Opacity**: 0.6-0.9 for pressed states
- **No bouncy springs**: Keep animations subtle and professional

## Accessibility
- Minimum touch target: 44x44pt
- Color contrast: WCAG AA compliant
- VoiceOver labels for all interactive elements
- Dynamic type support
- Haptic feedback for important actions

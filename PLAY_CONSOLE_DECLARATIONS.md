# Play Console Permission Declarations

## Location Permissions Declaration

### ACCESS_FINE_LOCATION, ACCESS_COARSE_LOCATION, ACCESS_BACKGROUND_LOCATION
**Prominent Feature**: Social Map Platform - Location-based Social Discovery

**Purpose**: 
SoRita is a social mapping application that helps users discover and share interesting places with friends. The core functionality requires location access to:

1. **Display User Location on Map**: Show current position on interactive map
2. **Discover Nearby Places**: Find and recommend interesting locations based on proximity
3. **Location Sharing**: Enable users to share their current location with friends
4. **Navigation**: Provide directions to selected places
5. **Social Features**: Connect with friends based on shared locations and experiences

### FOREGROUND_SERVICE_LOCATION
**Purpose**: Location Tracking During Active Navigation

When users are actively navigating to a destination, the app uses foreground service to maintain location updates for:
- Turn-by-turn navigation
- Real-time position tracking
- Route optimization
- Safety features during travel

## Media Permissions Declaration

### READ_MEDIA_IMAGES, READ_MEDIA_VIDEO, CAMERA
**Prominent Feature**: Place Photography and Social Sharing

**Purpose**:
SoRita allows users to enhance place discoveries with visual content:

1. **Place Documentation**: Users can photograph visited locations
2. **Social Sharing**: Share visual experiences with friends
3. **Place Reviews**: Add photos/videos to location reviews
4. **Memory Collection**: Create visual travel journals
5. **Community Content**: Contribute to shared place knowledge

**Core Functionality Justification**:
- Visual content is essential for place-based social platform
- Photos help other users identify and evaluate locations
- Visual sharing enhances social engagement
- Camera access enables immediate content creation

## Other Permissions

### POST_NOTIFICATIONS
- Friend activity updates
- Location-based recommendations
- Safety notifications during travel

### Biometric Permissions
- Secure authentication for personal location data
- Quick app access for location sharing

## Data Handling Commitment
- Location data used only for stated purposes
- No data selling to third parties
- User consent required for all location sharing
- Data encryption in transit and at rest
- User control over data retention and deletion

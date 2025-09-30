'use client';

import React from 'react';
import { MapPin, Phone, ExternalLink, Clock, Info, Car, Wheelchair } from 'lucide-react';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import BlurImage from '@/components/BlurImage';
import type { TicketmasterVenue } from '@/lib/api/ticketmaster-client';

interface TicketmasterVenueCardProps {
  venue: TicketmasterVenue;
  className?: string;
  showDetails?: boolean;
  compact?: boolean;
}

export function TicketmasterVenueCard({
  venue,
  className = '',
  showDetails = true,
  compact = false
}: TicketmasterVenueCardProps) {
  const imageUrl = venue.images?.find(img => img.ratio === '16_9')?.url || 
                   venue.images?.[0]?.url;

  const formatAddress = () => {
    const parts = [
      venue.address?.line1,
      venue.city?.name,
      venue.state?.stateCode,
      venue.postalCode
    ].filter(Boolean);
    
    return parts.join(', ');
  };

  const hasAccessibilityInfo = venue.accessibleSeatingDetail || venue.ada;
  const hasBoxOfficeInfo = venue.boxOfficeInfo;
  const upcomingEventCount = venue.upcomingEvents?.ticketmaster || 0;

  if (compact) {
    return (
      <Card className={`hover:shadow-lg transition-shadow duration-200 ${className}`}>
        <CardContent className="p-4">
          <div className="flex gap-4">
            {imageUrl && (
              <div className="w-16 h-16 flex-shrink-0">
                <BlurImage
                  src={imageUrl}
                  alt={venue.name}
                  width={64}
                  height={64}
                  className="rounded-lg object-cover w-full h-full"
                />
              </div>
            )}
            
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-lg truncate">{venue.name}</h3>
              
              <div className="flex items-center gap-2 mt-1 text-sm text-gray-600">
                <MapPin className="w-4 h-4" />
                <span className="truncate">{venue.city?.name}, {venue.state?.stateCode}</span>
              </div>
              
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="secondary" className="text-xs">
                  {venue.type}
                </Badge>
                {upcomingEventCount > 0 && (
                  <Badge variant="outline" className="text-xs">
                    {upcomingEventCount} upcoming events
                  </Badge>
                )}
              </div>
            </div>
            
            <div className="flex flex-col justify-center">
              {venue.url && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => window.open(venue.url, '_blank')}
                >
                  <ExternalLink className="w-4 h-4" />
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={`hover:shadow-lg transition-shadow duration-200 ${className}`}>
      <CardHeader className="p-0">
        {imageUrl && (
          <div className="relative h-48 w-full">
            <BlurImage
              src={imageUrl}
              alt={venue.name}
              fill
              className="rounded-t-lg object-cover"
            />
            
            {/* Venue type badge overlay */}
            <div className="absolute top-3 right-3">
              <Badge variant="outline" className="backdrop-blur-sm bg-white/90">
                {venue.type}
              </Badge>
            </div>
          </div>
        )}
      </CardHeader>

      <CardContent className="p-6">
        <div className="space-y-4">
          {/* Venue Name and Location */}
          <div>
            <h3 className="font-bold text-xl mb-2">{venue.name}</h3>
            
            <div className="flex items-start gap-2 text-sm text-gray-600">
              <MapPin className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
              <div>
                <div className="font-medium">{formatAddress()}</div>
                {venue.timezone && (
                  <div className="text-xs text-gray-500 mt-1">
                    Timezone: {venue.timezone}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Upcoming Events */}
          {upcomingEventCount > 0 && (
            <div className="flex items-center gap-2">
              <Badge variant="default" className="text-sm">
                {upcomingEventCount} upcoming events
              </Badge>
            </div>
          )}

          {showDetails && (
            <>
              {/* Box Office Information */}
              {hasBoxOfficeInfo && (
                <div className="space-y-2">
                  <h4 className="font-medium text-sm text-gray-900 flex items-center gap-2">
                    <Info className="w-4 h-4" />
                    Box Office
                  </h4>
                  
                  {venue.boxOfficeInfo?.phoneNumberDetail && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Phone className="w-4 h-4" />
                      <span>{venue.boxOfficeInfo.phoneNumberDetail}</span>
                    </div>
                  )}
                  
                  {venue.boxOfficeInfo?.openHoursDetail && (
                    <div className="flex items-start gap-2 text-sm text-gray-600">
                      <Clock className="w-4 h-4 mt-0.5" />
                      <span>{venue.boxOfficeInfo.openHoursDetail}</span>
                    </div>
                  )}
                  
                  {venue.boxOfficeInfo?.acceptedPaymentDetail && (
                    <div className="text-sm text-gray-600">
                      <span className="font-medium">Payment:</span> {venue.boxOfficeInfo.acceptedPaymentDetail}
                    </div>
                  )}
                </div>
              )}

              {/* Parking Information */}
              {venue.parkingDetail && (
                <div className="space-y-2">
                  <h4 className="font-medium text-sm text-gray-900 flex items-center gap-2">
                    <Car className="w-4 h-4" />
                    Parking
                  </h4>
                  <p className="text-sm text-gray-600">{venue.parkingDetail}</p>
                </div>
              )}

              {/* Accessibility Information */}
              {hasAccessibilityInfo && (
                <div className="space-y-2">
                  <h4 className="font-medium text-sm text-gray-900 flex items-center gap-2">
                    <Wheelchair className="w-4 h-4" />
                    Accessibility
                  </h4>
                  
                  {venue.accessibleSeatingDetail && (
                    <p className="text-sm text-gray-600">{venue.accessibleSeatingDetail}</p>
                  )}
                  
                  {venue.ada?.adaHours && (
                    <div className="text-sm text-gray-600">
                      <span className="font-medium">ADA Hours:</span> {venue.ada.adaHours}
                    </div>
                  )}
                  
                  {venue.ada?.adaPhones && (
                    <div className="text-sm text-gray-600">
                      <span className="font-medium">ADA Phone:</span> {venue.ada.adaPhones}
                    </div>
                  )}
                </div>
              )}

              {/* General Information */}
              {venue.generalInfo && (
                <div className="space-y-2">
                  <h4 className="font-medium text-sm text-gray-900">General Information</h4>
                  
                  {venue.generalInfo.generalRule && (
                    <div className="text-sm text-gray-600">
                      <span className="font-medium">Rules:</span> {venue.generalInfo.generalRule}
                    </div>
                  )}
                  
                  {venue.generalInfo.childRule && (
                    <div className="text-sm text-gray-600">
                      <span className="font-medium">Child Policy:</span> {venue.generalInfo.childRule}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </CardContent>

      <CardFooter className="p-6 pt-0">
        <div className="flex gap-3 w-full">
          {venue.url && (
            <Button
              onClick={() => window.open(venue.url, '_blank')}
              className="flex-1"
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              Visit Website
            </Button>
          )}
          
          {venue.location && (
            <Button
              variant="outline"
              onClick={() => {
                const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${venue.location.latitude},${venue.location.longitude}`;
                window.open(mapsUrl, '_blank');
              }}
              className="flex-shrink-0"
            >
              <MapPin className="w-4 h-4 mr-1" />
              Directions
            </Button>
          )}
        </div>
      </CardFooter>
    </Card>
  );
}
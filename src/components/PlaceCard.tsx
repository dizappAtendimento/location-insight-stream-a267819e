import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MapPin, Phone, Star, Globe, Building2 } from 'lucide-react';
import type { Place } from '@/hooks/useSearchPlaces';

interface PlaceCardProps {
  place: Place;
  index: number;
}

export function PlaceCard({ place, index }: PlaceCardProps) {
  return (
    <Card className="group hover:shadow-lg transition-all duration-300 border-border/50 hover:border-primary/30">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-semibold">
                {index + 1}
              </span>
              <h3 className="font-semibold text-foreground truncate">{place.name}</h3>
            </div>
            
            {place.category && (
              <Badge variant="secondary" className="mb-2 text-xs">
                <Building2 className="w-3 h-3 mr-1" />
                {place.category}
              </Badge>
            )}

            <div className="space-y-1.5 text-sm text-muted-foreground">
              {place.address && (
                <div className="flex items-start gap-2">
                  <MapPin className="w-4 h-4 shrink-0 mt-0.5" />
                  <span className="line-clamp-2">{place.address}</span>
                </div>
              )}
              
              {place.phone && (
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4 shrink-0" />
                  <a 
                    href={`tel:${place.phone}`} 
                    className="hover:text-primary transition-colors"
                  >
                    {place.phone}
                  </a>
                </div>
              )}

              {place.website && (
                <div className="flex items-center gap-2">
                  <Globe className="w-4 h-4 shrink-0" />
                  <a 
                    href={place.website} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="hover:text-primary transition-colors truncate"
                  >
                    {new URL(place.website).hostname}
                  </a>
                </div>
              )}
            </div>
          </div>

          {place.rating && (
            <div className="flex flex-col items-end shrink-0">
              <div className="flex items-center gap-1 text-amber-500">
                <Star className="w-4 h-4 fill-current" />
                <span className="font-semibold">{place.rating}</span>
              </div>
              {place.reviewCount && (
                <span className="text-xs text-muted-foreground">
                  {place.reviewCount} avaliações
                </span>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

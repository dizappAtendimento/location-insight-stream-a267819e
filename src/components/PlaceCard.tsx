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
    <Card className="group hover:shadow-md transition-all duration-200 border-border/50 hover:border-primary/30">
      <CardContent className="p-4">
        <div className="flex items-center gap-4">
          {/* Número */}
          <span className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary text-sm font-bold shrink-0">
            {index + 1}
          </span>

          {/* Nome e Categoria */}
          <div className="flex-1 min-w-0 flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3">
            <h3 className="font-semibold text-foreground truncate">{place.name}</h3>
            {place.category && (
              <Badge variant="secondary" className="text-xs w-fit">
                <Building2 className="w-3 h-3 mr-1" />
                {place.category}
              </Badge>
            )}
          </div>

          {/* Endereço */}
          {place.address && (
            <div className="hidden md:flex items-center gap-2 text-sm text-muted-foreground flex-1 min-w-0">
              <MapPin className="w-4 h-4 shrink-0" />
              <span className="truncate">{place.address}</span>
            </div>
          )}

          {/* Telefone */}
          {place.phone && (
            <div className="hidden lg:flex items-center gap-2 text-sm text-muted-foreground shrink-0">
              <Phone className="w-4 h-4" />
              <a href={`tel:${place.phone}`} className="hover:text-primary transition-colors">
                {place.phone}
              </a>
            </div>
          )}

          {/* Website */}
          {place.website && (
            <div className="hidden xl:flex items-center gap-2 text-sm shrink-0">
              <Globe className="w-4 h-4 text-muted-foreground" />
              <a 
                href={place.website} 
                target="_blank" 
                rel="noopener noreferrer"
                className="hover:text-primary transition-colors text-muted-foreground"
              >
                {new URL(place.website).hostname}
              </a>
            </div>
          )}

          {/* Rating */}
          {place.rating && (
            <div className="flex items-center gap-1 text-amber-500 shrink-0">
              <Star className="w-4 h-4 fill-current" />
              <span className="font-semibold text-sm">{place.rating}</span>
              {place.reviewCount && (
                <span className="text-xs text-muted-foreground">({place.reviewCount})</span>
              )}
            </div>
          )}
        </div>

        {/* Linha mobile com endereço e telefone */}
        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 md:hidden text-sm text-muted-foreground">
          {place.address && (
            <div className="flex items-center gap-1">
              <MapPin className="w-3 h-3" />
              <span className="truncate">{place.address}</span>
            </div>
          )}
          {place.phone && (
            <div className="flex items-center gap-1">
              <Phone className="w-3 h-3" />
              <a href={`tel:${place.phone}`} className="hover:text-primary">
                {place.phone}
              </a>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

import React from "react";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "../../ui/input-group";
import { Search } from "lucide-react";
import { useBusFinder } from "@/context/buses";
import { Spinner } from "@/components/ui/spinner";

const SearchInput = () => {
  const {
    stops,
    searchQuery,
    setSearchQuery,
    debouncedSearchQuery,
    isLoadingStops,
    stopsError,
  } = useBusFinder();

  // Only once the debounce has fired, or the first keystroke would report no
  // matches for a search that hasn't run yet.
  const hasSearched = debouncedSearchQuery.trim().length > 0;

  return (
    // `InputGroup` carries `dark:bg-input/30` and no unprefixed background of
    // its own, so in dark mode this field is a translucent pane over the map
    // tiles. The `dark:`-scoped copy is what displaces it — see the note in
    // `components/map/index.tsx` for why a plain `bg-card` alone can't.
    <InputGroup className="bg-card dark:bg-card">
      <InputGroupInput
        placeholder="busca la teva parada"
        aria-label="busca la teva parada"
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
      />
      <InputGroupAddon>
        <Search />
      </InputGroupAddon>
      <InputGroupAddon align="inline-end">
        {isLoadingStops ? (
          <>
            carregant
            <Spinner />
          </>
        ) : stopsError ? (
          // Zero results used to render nothing at all — identical to an idle
          // field, so a failed search looked like a search for something that
          // doesn't exist.
          <span className="text-destructive">error</span>
        ) : stops.length > 0 ? (
          `${stops.length} parades`
        ) : (
          hasSearched && "cap parada"
        )}
      </InputGroupAddon>
    </InputGroup>
  );
};

export default SearchInput;

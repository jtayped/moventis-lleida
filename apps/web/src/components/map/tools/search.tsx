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
  const { stops, searchQuery, setSearchQuery, isLoadingStops } = useBusFinder();

  return (
    // `InputGroup` carries `dark:bg-input/30` and no unprefixed background of
    // its own, so in dark mode this field is a translucent pane over the map
    // tiles. The `dark:`-scoped copy is what displaces it — see the note in
    // `components/map/index.tsx` for why a plain `bg-card` alone can't.
    <InputGroup className="bg-card dark:bg-card">
      <InputGroupInput
        placeholder="busca la teva parada"
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
        ) : (
          stops.length > 0 && `${stops.length} parades`
        )}
      </InputGroupAddon>
    </InputGroup>
  );
};

export default SearchInput;

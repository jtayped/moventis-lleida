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
    <InputGroup className="bg-card">
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
          (stops?.length ?? 0) > 0 && `${stops?.length ?? 0} parades`
        )}
      </InputGroupAddon>
    </InputGroup>
  );
};

export default SearchInput;

import React from "react";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "../ui/input-group";
import { Search } from "lucide-react";
import { useBusFinder } from "@/context/buses";

const SearchInput = () => {
  const { stops, searchQuery, setSearchQuery, isLoadingStops } = useBusFinder();

  return (
    <InputGroup className="bg-card">
      <InputGroupInput
        placeholder="Search stop..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
      />
      <InputGroupAddon>
        <Search />
      </InputGroupAddon>
      <InputGroupAddon align="inline-end">
        {isLoadingStops ? "..." : `${stops?.length ?? 0} stops`}
      </InputGroupAddon>
    </InputGroup>
  );
};

export default SearchInput;

import styled from "@emotion/styled";
import { HTMLAttributes } from "react";
import { IconFlag } from "@tabler/icons-react";

const DebugTableCellContainer = styled.td`
  background: rgba(255, 255, 255, 0.9);
  font-size: 4vw;
  overflow: hidden;
  word-break: break-all;
  backdrop-filter: blur(4px);
  &:hover {
    color: rgba(0, 0, 0, 0.5);
    background: rgba(255, 255, 255, 0);
    backdrop-filter: none;
  }
`;

const DebugTableCellContainerNull = styled(DebugTableCellContainer)`
  background: rgba(77, 77, 77, 0.9);
`;

const DebugTableCellContainerFlag = styled(DebugTableCellContainer)`
  background: rgba(255, 187, 0, 0.9);
`;

interface Props extends HTMLAttributes<HTMLElement> {
  tile: string | null;
}

const DebugCell = ({ tile, ...rest }: Props) => {
  if (tile === "null") return <DebugTableCellContainerNull {...rest} />;
  if (tile === "flag")
    return (
      <DebugTableCellContainerFlag {...rest}>
        <IconFlag
          style={{
            width: "4vw",
            height: "4vw",
          }}
        />
      </DebugTableCellContainerFlag>
    );
  if (tile === "hidden")
    return <DebugTableCellContainer {...rest}>?</DebugTableCellContainer>;
  return <DebugTableCellContainer {...rest}>{tile}</DebugTableCellContainer>;
};

export default DebugCell;

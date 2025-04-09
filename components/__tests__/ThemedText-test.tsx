import * as React from "react";
import renderer from "react-test-renderer";

import { ThemedText } from "../ThemedText";
import { primary } from "@/shared/colors";

it(`renders correctly`, () => {
  const tree = renderer
    .create(<ThemedText color={primary}>Snapshot test!</ThemedText>)
    .toJSON();

  expect(tree).toMatchSnapshot();
});

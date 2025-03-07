/*!
 * Copyright (c) Microsoft Corporation and contributors. All rights reserved.
 * Licensed under the MIT License.
 */

import { ContainerSchema, SharedTree } from "fluid-framework";
import { treeDataObject } from "@fluid-experimental/tree-react-api";
import { appTreeConfiguration } from "./app_schema.js";

// Define the schema of our Container. This includes the DDSes/DataObjects
// that we want to create dynamically and any
// initial DataObjects we want created when the container is first created.
export const containerSchema = {
	initialObjects: {
		appData: treeDataObject("AppData", appTreeConfiguration, () => []),
		sessionData: SharedTree,
	},
} satisfies ContainerSchema;

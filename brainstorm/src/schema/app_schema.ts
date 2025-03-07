/*!
 * Copyright (c) Microsoft Corporation and contributors. All rights reserved.
 * Licensed under the MIT License.
 */

import { TreeViewConfiguration } from "fluid-framework";
import type {
	ItemSchema,
	MyAppComponent,
	MyAppConfigPartial,
} from "../components/itemAbstractions.js";
import { noteComponent } from "../components/note.js";
import { groupComponent } from "../components/group.js";
import { Component, evaluateLazySchema } from "fluid-framework/alpha";
import { makeItems, Items as ItemsType } from "../components/items.js";
import { boxComponent } from "../components/box.js";

/**
 * Example configuration type for an application.
 *
 * Contains a collection of schema to demonstrate how ComponentSchemaCollection works for schema dependency inversions.
 */
export interface MyAppConfig extends MyAppConfigPartial {
	/**
	 * Set of all ItemSchema contributed by components.
	 * @remarks
	 * Same content as {@link MyAppConfig.allowedItemTypes}, but normalized into a Set.
	 */
	readonly items: ReadonlySet<ItemSchema>;
}

/**
 * The application specific compose logic.
 *
 * Information from the components can be aggregated into the configuration.
 */
export function composeComponents(allComponents: readonly MyAppComponent[]): MyAppConfig {
	const lazyConfig = () => config;
	const ItemTypes = Component.composeComponentSchema(
		allComponents.map((c) => c.itemTypes),
		lazyConfig,
	);
	const config: MyAppConfigPartial = {
		allowedItemTypes: ItemTypes,
		Items: makeItems(ItemTypes),
	};
	const items = new Set(ItemTypes.map(evaluateLazySchema));
	return { ...config, items };
}

export const appConfig = composeComponents([groupComponent, noteComponent, boxComponent]);

export const itemAllowedTypes: Component.LazyArray<ItemSchema> = appConfig.allowedItemTypes;

export const Items = appConfig.Items;
export type Items = ItemsType;

// Export the tree config appropriate for this schema.
// This is passed into the SharedTree when it is initialized.
// This eagerly evaluates the schema, so anything that used by these schema must be defined before this point.
export const appTreeConfiguration = new TreeViewConfiguration(
	// Schema for the root
	{ schema: appConfig.Items },
);

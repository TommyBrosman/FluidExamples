/*!
 * Copyright (c) Microsoft Corporation and contributors. All rights reserved.
 * Licensed under the MIT License.
 */

import {
	Component,
	customizeSchemaTyping,
	evaluateLazySchema,
	NodeFromSchema,
	SchemaFactory,
	Tree,
} from "fluid-framework/alpha";
import { Session } from "../schema/session_schema.js";
import { Group } from "./group.js";
import { Note } from "./note.js";
import React, { JSX } from "react";
import { Item, ItemSchema } from "./itemAbstractions.js";

const sf = new SchemaFactory("d0e4467e-71fe-4951-a218-2f48eab646fb");

function makeItems(items: Component.LazyArray<ItemSchema>) {
	// Schema for a list of Notes and Groups.
	return class Items extends sf.array(
		"Items",
		customizeSchemaTyping(items).simplifiedUnrestricted<Item>(),
	) {};
}

export type Items = NodeFromSchema<ReturnType<typeof makeItems>>;

// Below here in this file, there are dependencies on the concrete set of Item types.

export const itemAllowedTypes: Component.LazyArray<ItemSchema> = [() => Group, () => Note];

export const Items = makeItems(itemAllowedTypes);

export function ItemsView(props: {
	isRoot: boolean;
	items: Item[];
	parent: Items;
	clientId: string;
	session: Session;
	fluidMembers: string[];
}): JSX.Element {
	const pilesArray: JSX.Element[] = [];
	for (const i of props.items) {
		const View = i.View;
		pilesArray.push(
			<View
				key={i.id}
				schema={i}
				clientId={props.clientId}
				session={props.session}
				fluidMembers={props.fluidMembers}
			/>,
		);
	}
}

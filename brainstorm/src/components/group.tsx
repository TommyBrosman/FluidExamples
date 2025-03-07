/*!
 * Copyright (c) Microsoft Corporation and contributors. All rights reserved.
 * Licensed under the MIT License.
 */

import { SchemaFactory, Tree } from "fluid-framework";
import { Item, itemFields, ItemSchema, ItemsSchema, MyAppComponent } from "./itemAbstractions.js";
import React, { JSX, useEffect, useState } from "react";
import { dragType } from "../utils/utils.js";
import { ConnectableElement, useDrag, useDrop } from "react-dnd";
import { findItem } from "../utils/app_helpers.js";
import { DeleteButton } from "../react/buttonux.js";
import { Session } from "../schema/session_schema.js";
import { Component, TreeAlpha } from "fluid-framework/alpha";
import { getSelectedItems } from "../utils/session_helpers.js";
import { RectangleLandscapeRegular } from "@fluentui/react-icons";
import { canDropItem, Items, tryAsItemParent } from "./items.js";

// Include a UUID to guarantee that this schema will be uniquely identifiable.
const sf = new SchemaFactory("d3872080-b9bd-4315-a210-0dda4fedcb18");

/**
 * Groups can contain any type of item via the generic ItemsSchema.
 * This includes other groups.
 * For this to work without producing a cyclic dependency, the final version of ItemsSchema,
 * which includes Group, gets lazy schema references to its content types derived from the {@link MyAppComponent}s,
 * and that ItemsSchema is then injected into here (also as part of composing the app components).
 */
function makeGroup(itemsSchema: ItemsSchema) {
	// Define the schema for the container of notes.
	class Group
		extends sf.object("Group", {
			...itemFields,
			name: sf.string,
			items: itemsSchema,
		})
		implements Item
	{
		public children(): Iterable<Item> {
			return this.items;
		}
		public static readonly description = "Group";
		public static readonly icon = (<RectangleLandscapeRegular />);
		public static default(author: string, name = "[new group]"): Group {
			return new Group({
				name,
				items: new itemsSchema([]),
			});
		}

		public postInsertNew(session: Session, clientId: string): void {
			// Move selected items into this group

			// Look for selected items within root Items subtree.
			// TODO: consider making findItem more generic to allow searching subtrees with unknown schema.
			const branch = TreeAlpha.branch(this);
			if (!branch?.hasRootSchema(itemsSchema)) {
				return;
			}

			const ids = getSelectedItems(session, clientId);
			for (const id of ids) {
				const n = findItem(branch.root, id);
				if (n !== undefined) {
					tryAsItemParent(this.items)?.tryStealItem(n);
				}
			}
		}

		public deleted(oldParent: Items, oldIndex: number): void {
			// Move the children of the group to the parent
			if (this.items.length !== 0) {
				oldParent.moveRangeToIndex(oldIndex, 0, this.items.length, this.items);
			}
		}

		public readonly View = (props: {
			clientId: string;
			session: Session;
			fluidMembers: string[];
		}): JSX.Element => {
			return <GroupView group={this} {...props} />;
		};

		/**
		 * Removes a group from its parent {@link Items}.
		 * If the note is not in an {@link Items}, it is left unchanged.
		 *
		 * Before removing the group, its children are move to the parent.
		 */
		public readonly delete = () => {
			const parent = Tree.parent(this);
			if (Tree.is(parent, itemsSchema)) {
				// Run the deletion as a transaction to ensure that the tree is in a consistent state
				Tree.runTransaction(parent, () => {
					// Move the children of the group to the parent
					if (this.items.length !== 0) {
						const index = parent.indexOf(this);
						parent.moveRangeToIndex(index, 0, this.items.length, this.items);
					}

					// Delete the now empty group
					const i = parent.indexOf(this);
					parent.removeAt(i);
				});
			}
		};
	}

	return Group;
}

type Group = InstanceType<ReturnType<typeof makeGroup>>;

export function GroupView(props: {
	group: Group;
	clientId: string;
	session: Session;
	fluidMembers: string[];
}): JSX.Element {
	const [name, setName] = useState(props.group.name);

	// Register for tree changes when the component mounts.
	// Any time the group changes, the app will update
	useEffect(() => {
		const unsubscribe = Tree.on(props.group, "nodeChanged", () => {
			setName(props.group.name);
		});
		return unsubscribe;
	}, []);

	const [items, setItems] = useState(props.group.items);
	useEffect(() => {
		const unsubscribe = Tree.on(props.group, "nodeChanged", () => {
			setItems(props.group.items);
		});
		return unsubscribe;
	}, []);

	const [, drag] = useDrag(() => ({
		type: dragType.ITEM,
		item: props.group,
		collect: (monitor) => ({
			isDragging: monitor.isDragging(),
		}),
	}));

	const [{ isOver, canDrop }, drop] = useDrop(() => ({
		accept: [dragType.ITEM],
		collect: (monitor) => ({
			isOver: !!monitor.isOver({ shallow: true }),
			canDrop: !!monitor.canDrop(),
		}),
		canDrop: (item: Item) => canDropItem(item, Tree.parent(props.group)),
		drop: (item: Item, monitor) => {
			const didDrop = monitor.didDrop();
			if (didDrop) {
				return;
			}

			const isOver = monitor.isOver({ shallow: true });
			if (!isOver) {
				return;
			}

			tryAsItemParent(Tree.parent(props.group))?.tryStealItem(item, props.group);

			return;
		},
	}));

	function attachRef(el: ConnectableElement) {
		drag(el);
		drop(el);
	}

	const handleClick = (e: React.MouseEvent) => {
		e.stopPropagation();
	};

	const ItemsView = items.View;

	return (
		<div
			onClick={(e) => handleClick(e)}
			ref={attachRef}
			className={
				"transition-all border-l-4 border-dashed " +
				(isOver && canDrop ? "border-gray-500" : "border-transparent")
			}
		>
			<div
				className={
					"p-2 bg-gray-200 min-h-64 transition-all " +
					(isOver && canDrop ? "translate-x-3" : "")
				}
				aria-label="Note Group"
			>
				<GroupToolbar
					name={name}
					changeName={(name: string) => {
						props.group.name = name;
					}}
					deletePile={props.group.delete}
				/>
				<ItemsView
					clientId={props.clientId}
					session={props.session}
					fluidMembers={props.fluidMembers}
				/>
			</div>
		</div>
	);
}

function GroupName(props: { name: string; changeName: (name: string) => void }): JSX.Element {
	return (
		<input
			className="flex w-0 grow p-1 mb-2 mr-2 text-lg font-bold text-black bg-transparent"
			type="text"
			value={props.name}
			onChange={(event) => props.changeName(event.target.value)}
		/>
	);
}

function GroupToolbar(props: {
	name: string;
	changeName: (name: string) => void;
	deletePile: () => void;
}): JSX.Element {
	return (
		<div className="flex flex-row justify-between">
			<GroupName {...props} />
			<DeletePileButton {...props} />
		</div>
	);
}

export function DeletePileButton(props: { deletePile: () => void }): JSX.Element {
	return <DeleteButton handleClick={() => props.deletePile()}></DeleteButton>;
}

export const groupComponent: MyAppComponent = {
	itemTypes(config): Component.LazyArray<ItemSchema> {
		return [() => makeGroup(config().Items)];
	},
};

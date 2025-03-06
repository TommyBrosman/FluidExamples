/*!
 * Copyright (c) Microsoft Corporation and contributors. All rights reserved.
 * Licensed under the MIT License.
 */

import React, { JSX, useEffect, useState } from "react";
import { Session } from "../schema/session_schema.js";
import {
	ConnectionState,
	IFluidContainer,
	IMember,
	IServiceAudience,
	Tree,
	TreeView,
} from "fluid-framework";
import {
	Floater,
	NewGroupButton,
	NewNoteButton,
	DeleteNotesButton,
	ButtonGroup,
	UndoButton,
	RedoButton,
} from "./buttonux.js";
import { undefinedUserId } from "../utils/utils.js";
import { undoRedo } from "../utils/undo.js";
import { itemAllowedTypes, Items, ItemsView } from "../components/items.js";
import { Item } from "../components/itemAbstractions.js";
import { evaluateLazySchema } from "fluid-framework/alpha";

export function Canvas(props: {
	items: TreeView<typeof Items>;
	sessionTree: TreeView<typeof Session>;
	audience: IServiceAudience<IMember>;
	container: IFluidContainer;
	fluidMembers: string[];
	currentUser: string;
	undoRedo: undoRedo;
	setCurrentUser: (arg: string) => void;
	setConnectionState: (arg: string) => void;
	setSaved: (arg: boolean) => void;
	setFluidMembers: (arg: string[]) => void;
}): JSX.Element {
	const [itemsArray, setItemsArray] = useState<Item[]>(props.items.root.map((item) => item));

	// Register for tree deltas when the component mounts.
	// Any time the items array changes, the app will update.
	useEffect(() => {
		const unsubscribe = Tree.on(props.items.root, "nodeChanged", () => {
			setItemsArray(props.items.root.map((item) => item));
		});
		return unsubscribe;
	}, []);

	useEffect(() => {
		const updateConnectionState = () => {
			if (props.container.connectionState === ConnectionState.Connected) {
				props.setConnectionState("connected");
			} else if (props.container.connectionState === ConnectionState.Disconnected) {
				props.setConnectionState("disconnected");
			} else if (props.container.connectionState === ConnectionState.EstablishingConnection) {
				props.setConnectionState("connecting");
			} else if (props.container.connectionState === ConnectionState.CatchingUp) {
				props.setConnectionState("catching up");
			}
		};
		updateConnectionState();
		props.setSaved(!props.container.isDirty);
		props.container.on("connected", updateConnectionState);
		props.container.on("disconnected", updateConnectionState);
		props.container.on("dirty", () => props.setSaved(false));
		props.container.on("saved", () => props.setSaved(true));
		props.container.on("disposed", updateConnectionState);
	}, []);

	const updateMembers = () => {
		if (props.audience.getMyself() == undefined) return;
		if (props.audience.getMyself()?.id == undefined) return;
		if (props.audience.getMembers() == undefined) return;
		if (props.container.connectionState !== ConnectionState.Connected) return;
		if (props.currentUser == undefinedUserId) {
			const user = props.audience.getMyself()?.id;
			if (typeof user === "string") {
				props.setCurrentUser(user);
			}
		}
		props.setFluidMembers(Array.from(props.audience.getMembers().keys()));
	};

	useEffect(() => {
		props.audience.on("membersChanged", updateMembers);
		updateMembers();
		return () => {
			props.audience.off("membersChanged", updateMembers);
		};
	}, []);

	const isRoot = Tree.parent(props.items.root) === undefined;

	let itemsView = (
		<ItemsView
			isRoot={isRoot}
			items={itemsArray}
			parent={props.items.root}
			clientId={props.currentUser}
			session={props.sessionTree.root}
			fluidMembers={props.fluidMembers}
		/>
	);

	if (isRoot) {
		return (itemsView = (
			<div className="flex grow-0 flex-row h-full w-full flex-wrap gap-4 p-4 content-start overflow-y-scroll">
				{itemsView}
				<div className="flex w-full h-24"></div>
			</div>
		));
	} else {
		const kinds = itemAllowedTypes.map(evaluateLazySchema);
		for (const kind of kinds) {
			if (kind.AddButton !== undefined) {
				// TODO: use key?
				// const key = `new${kind.description}`;
				pilesArray.push(<kind.AddButton target={props.parent} clientId={props.clientId} />);
			}
		}

		itemsView = <div className="flex flex-row flex-wrap gap-8 p-2">{pilesArray}</div>;
	}

	return (
		<div className="relative flex grow-0 h-full w-full bg-transparent">
			{itemsView}
			<Floater>
				<ButtonGroup>
					<NewGroupButton
						items={props.items.root}
						session={props.sessionTree.root}
						clientId={props.currentUser}
					/>
					<NewNoteButton items={props.items.root} clientId={props.currentUser} />
					<DeleteNotesButton
						session={props.sessionTree.root}
						items={props.items.root}
						clientId={props.currentUser}
					/>
				</ButtonGroup>
				<ButtonGroup>
					<UndoButton undo={() => props.undoRedo.undo()} />
					<RedoButton redo={() => props.undoRedo.redo()} />
				</ButtonGroup>
			</Floater>
		</div>
	);
}

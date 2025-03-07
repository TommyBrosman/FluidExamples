/*!
 * Copyright (c) Microsoft Corporation and contributors. All rights reserved.
 * Licensed under the MIT License.
 */

import React, { JSX, useEffect } from "react";
import { Session } from "../schema/session_schema.js";
import {
	ConnectionState,
	IFluidContainer,
	IMember,
	IServiceAudience,
	TreeView,
} from "fluid-framework";
import {
	Floater,
	NewItemButton,
	DeleteNotesButton,
	ButtonGroup,
	UndoButton,
	RedoButton,
} from "./buttonux.js";
import { undefinedUserId } from "../utils/utils.js";
import { undoRedo } from "../utils/undo.js";
import { evaluateLazySchema } from "fluid-framework/alpha";
import { itemAllowedTypes, Items } from "../schema/app_schema.js";

export function Canvas(props: {
	items: Items;
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

	const newItemButtons: JSX.Element[] = itemAllowedTypes.map((item) => {
		const Item = evaluateLazySchema(item);
		return (
			<NewItemButton
				key={Item.description}
				Item={Item}
				items={props.items}
				session={props.sessionTree.root}
				clientId={props.currentUser}
			/>
		);
	});

	const ItemsView = props.items.View;

	return (
		<div className="relative flex grow-0 h-full w-full bg-transparent">
			<div>
				<ItemsView
					clientId={props.currentUser}
					session={props.sessionTree.root}
					fluidMembers={props.fluidMembers}
				/>
				<div className="flex w-full h-24"></div>
			</div>
			<Floater>
				<ButtonGroup>
					{newItemButtons}
					<DeleteNotesButton
						session={props.sessionTree.root}
						items={props.items}
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

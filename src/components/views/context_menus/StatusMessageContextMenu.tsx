/*
Copyright 2018 New FM Foundation

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

import React, { ChangeEvent } from 'react';
import { _t } from '../../../languageHandler';
import { MatrixClientPeg } from '../../../MatrixClientPeg';
import AccessibleButton, { ButtonEvent } from '../elements/AccessibleButton';
import { replaceableComponent } from "../../../utils/replaceableComponent";
import { User } from "matrix-js-sdk/src/models/user";
import Spinner from "../elements/Spinner";

interface IProps {
    // js-sdk User object. Not required because it might not exist.
    user?: User;
}

interface IState {
    message: string;
    waiting: boolean;
}

@replaceableComponent("views.context_menus.StatusMessageContextMenu")
export default class StatusMessageContextMenu extends React.Component<IProps, IState> {
    constructor(props: IProps) {
        super(props);

        this.state = {
            message: this.comittedStatusMessage,
            waiting: false,
        };
    }

    public componentDidMount(): void {
        const { user } = this.props;
        if (!user) {
            return;
        }
        user.on("User._unstable_statusMessage", this.onStatusMessageCommitted);
    }

    public componentWillUnmount(): void {
        const { user } = this.props;
        if (!user) {
            return;
        }
        user.removeListener(
            "User._unstable_statusMessage",
            this.onStatusMessageCommitted,
        );
    }

    get comittedStatusMessage(): string {
        return this.props.user ? this.props.user.unstable_statusMessage : "";
    }

    private onStatusMessageCommitted = (): void => {
        // The `User` object has observed a status message change.
        this.setState({
            message: this.comittedStatusMessage,
            waiting: false,
        });
    };

    private onClearClick = (): void=> {
        MatrixClientPeg.get()._unstable_setStatusMessage("");
        this.setState({
            waiting: true,
        });
    };

    private onSubmit = (e: ButtonEvent): void => {
        e.preventDefault();
        MatrixClientPeg.get()._unstable_setStatusMessage(this.state.message);
        this.setState({
            waiting: true,
        });
    };

    private onStatusChange = (e: ChangeEvent): void => {
        // The input field's value was changed.
        this.setState({
            message: (e.target as HTMLInputElement).value,
        });
    };

    public render(): JSX.Element {
        let actionButton;
        if (this.comittedStatusMessage) {
            if (this.state.message === this.comittedStatusMessage) {
                actionButton = <AccessibleButton className="mx_StatusMessageContextMenu_clear"
                    onClick={this.onClearClick}
                >
                    <span>{ _t("Clear status") }</span>
                </AccessibleButton>;
            } else {
                actionButton = <AccessibleButton className="mx_StatusMessageContextMenu_submit"
                    onClick={this.onSubmit}
                >
                    <span>{ _t("Update status") }</span>
                </AccessibleButton>;
            }
        } else {
            actionButton = <AccessibleButton
                className="mx_StatusMessageContextMenu_submit"
                disabled={!this.state.message}
                onClick={this.onSubmit}
            >
                <span>{ _t("Set status") }</span>
            </AccessibleButton>;
        }

        let spinner = null;
        if (this.state.waiting) {
            spinner = <Spinner w={24} h={24} />;
        }

        const form = <form
            className="mx_StatusMessageContextMenu_form"
            autoComplete="off"
            onSubmit={this.onSubmit}
        >
            <input
                type="text"
                className="mx_StatusMessageContextMenu_message"
                key="message"
                placeholder={_t("Set a new status...")}
                autoFocus={true}
                maxLength={60}
                value={this.state.message}
                onChange={this.onStatusChange}
            />
            <div className="mx_StatusMessageContextMenu_actionContainer">
                { actionButton }
                { spinner }
            </div>
        </form>;

        return <div className="mx_StatusMessageContextMenu">
            { form }
        </div>;
    }
}

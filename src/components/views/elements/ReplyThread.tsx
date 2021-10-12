/*
Copyright 2017 - 2021 FM Foundation
Copyright 2019 Michael Telatynski <7t3chguy@gmail.com>

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

import React from 'react';
import classNames from 'classnames';

import { _t } from '../../../languageHandler';
import dis from '../../../dispatcher/dispatcher';
import { MatrixEvent } from 'matrix-js-sdk/src/models/event';
import { UNSTABLE_ELEMENT_REPLY_IN_THREAD } from "matrix-js-sdk/src/@types/event";
import { makeUserPermalink, RoomPermalinkCreator } from "../../../utils/permalinks/Permalinks";
import SettingsStore from "../../../settings/SettingsStore";
import { Layout } from "../../../settings/Layout";
import escapeHtml from "escape-html";
import MatrixClientContext from "../../../contexts/MatrixClientContext";
import { getUserNameColorClass } from "../../../utils/FormattingUtils";
import { Action } from "../../../dispatcher/actions";
import sanitizeHtml from "sanitize-html";
import { PERMITTED_URL_SCHEMES } from "../../../HtmlUtils";
import { replaceableComponent } from "../../../utils/replaceableComponent";
import Spinner from './Spinner';
import ReplyTile from "../rooms/ReplyTile";
import Pill from './Pill';
import { Room } from 'matrix-js-sdk/src/models/room';

/**
 * This number is based on the previous behavior - if we have message of height
 * over 60px then we want to show button that will allow to expand it.
 */
const SHOW_EXPAND_QUOTE_PIXELS = 60;

interface IProps {
    // the latest event in this chain of replies
    parentEv?: MatrixEvent;
    // called when the ReplyThread contents has changed, including EventTiles thereof
    onHeightChanged: () => void;
    permalinkCreator: RoomPermalinkCreator;
    // Specifies which layout to use.
    layout?: Layout;
    // Whether to always show a timestamp
    alwaysShowTimestamps?: boolean;
    forExport?: boolean;
    isQuoteExpanded?: boolean;
    setQuoteExpanded: (isExpanded: boolean) => void;
}

interface IState {
    // The loaded events to be rendered as linear-replies
    events: MatrixEvent[];
    // The latest loaded event which has not yet been shown
    loadedEv: MatrixEvent;
    // Whether the component is still loading more events
    loading: boolean;
    // Whether as error was encountered fetching a replied to event.
    err: boolean;
}

// This component does no cycle detection, simply because the only way to make such a cycle would be to
// craft event_id's, using a homeserver that generates predictable event IDs; even then the impact would
// be low as each event being loaded (after the first) is triggered by an explicit user action.
@replaceableComponent("views.elements.ReplyThread")
export default class ReplyThread extends React.Component<IProps, IState> {
    static contextType = MatrixClientContext;
    private unmounted = false;
    private room: Room;
    private blockquoteRef = React.createRef<HTMLElement>();

    constructor(props, context) {
        super(props, context);

        this.state = {
            events: [],
            loadedEv: null,
            loading: true,
            err: false,
        };

        this.room = this.context.getRoom(this.props.parentEv.getRoomId());
    }

    public static getParentEventId(ev: MatrixEvent): string | undefined {
        if (!ev || ev.isRedacted()) return;

        // XXX: For newer relations (annotations, replacements, etc.), we now
        // have a `getRelation` helper on the event, and you might assume it
        // could be used here for replies as well... However, the helper
        // currently assumes the relation has a `rel_type`, which older replies
        // do not, so this block is left as-is for now.
        //
        // We're prefer ev.getContent() over ev.getWireContent() to make sure
        // we grab the latest edit with potentially new relations. But we also
        // can't just rely on ev.getContent() by itself because historically we
        // still show the reply from the original message even though the edit
        // event does not include the relation reply.
        const mRelatesTo = ev.getContent()['m.relates_to'] || ev.getWireContent()['m.relates_to'];
        if (mRelatesTo && mRelatesTo['m.in_reply_to']) {
            const mInReplyTo = mRelatesTo['m.in_reply_to'];
            if (mInReplyTo && mInReplyTo['event_id']) return mInReplyTo['event_id'];
        }
    }

    // Part of Replies fallback support
    public static stripPlainReply(body: string): string {
        // Removes lines beginning with `> ` until you reach one that doesn't.
        const lines = body.split('\n');
        while (lines.length && lines[0].startsWith('> ')) lines.shift();
        // Reply fallback has a blank line after it, so remove it to prevent leading newline
        if (lines[0] === '') lines.shift();
        return lines.join('\n');
    }

    // Part of Replies fallback support
    public static stripHTMLReply(html: string): string {
        // Sanitize the original HTML for inclusion in <mx-reply>.  We allow
        // any HTML, since the original sender could use special tags that we
        // don't recognize, but want to pass along to any recipients who do
        // recognize them -- recipients should be sanitizing before displaying
        // anyways.  However, we sanitize to 1) remove any mx-reply, so that we
        // don't generate a nested mx-reply, and 2) make sure that the HTML is
        // properly formatted (e.g. tags are closed where necessary)
        return sanitizeHtml(
            html,
            {
                allowedTags: false, // false means allow everything
                allowedAttributes: false,
                // we somehow can't allow all schemes, so we allow all that we
                // know of and mxc (for img tags)
                allowedSchemes: [...PERMITTED_URL_SCHEMES, 'mxc'],
                exclusiveFilter: (frame) => frame.tag === "mx-reply",
            },
        );
    }

    // Part of Replies fallback support
    public static getNestedReplyText(
        ev: MatrixEvent,
        permalinkCreator: RoomPermalinkCreator,
    ): { body: string, html: string } | null {
        if (!ev) return null;

        let { body, formatted_body: html } = ev.getContent();
        if (this.getParentEventId(ev)) {
            if (body) body = this.stripPlainReply(body);
        }

        if (!body) body = ""; // Always ensure we have a body, for reasons.

        if (html) {
            // sanitize the HTML before we put it in an <mx-reply>
            html = this.stripHTMLReply(html);
        } else {
            // Escape the body to use as HTML below.
            // We also run a nl2br over the result to fix the fallback representation. We do this
            // after converting the text to safe HTML to avoid user-provided BR's from being converted.
            html = escapeHtml(body).replace(/\n/g, '<br/>');
        }

        // dev note: do not rely on `body` being safe for HTML usage below.

        const evLink = permalinkCreator.forEvent(ev.getId());
        const userLink = makeUserPermalink(ev.getSender());
        const mxid = ev.getSender();

        // This fallback contains text that is explicitly EN.
        switch (ev.getContent().msgtype) {
            case 'm.text':
            case 'm.notice': {
                html = `<mx-reply><blockquote><a href="${evLink}">In reply to</a> <a href="${userLink}">${mxid}</a>`
                    + `<br>${html}</blockquote></mx-reply>`;
                const lines = body.trim().split('\n');
                if (lines.length > 0) {
                    lines[0] = `<${mxid}> ${lines[0]}`;
                    body = lines.map((line) => `> ${line}`).join('\n') + '\n\n';
                }
                break;
            }
            case 'm.image':
                html = `<mx-reply><blockquote><a href="${evLink}">In reply to</a> <a href="${userLink}">${mxid}</a>`
                    + `<br>sent an image.</blockquote></mx-reply>`;
                body = `> <${mxid}> sent an image.\n\n`;
                break;
            case 'm.video':
                html = `<mx-reply><blockquote><a href="${evLink}">In reply to</a> <a href="${userLink}">${mxid}</a>`
                    + `<br>sent a video.</blockquote></mx-reply>`;
                body = `> <${mxid}> sent a video.\n\n`;
                break;
            case 'm.audio':
                html = `<mx-reply><blockquote><a href="${evLink}">In reply to</a> <a href="${userLink}">${mxid}</a>`
                    + `<br>sent an audio file.</blockquote></mx-reply>`;
                body = `> <${mxid}> sent an audio file.\n\n`;
                break;
            case 'm.file':
                html = `<mx-reply><blockquote><a href="${evLink}">In reply to</a> <a href="${userLink}">${mxid}</a>`
                    + `<br>sent a file.</blockquote></mx-reply>`;
                body = `> <${mxid}> sent a file.\n\n`;
                break;
            case 'm.emote': {
                html = `<mx-reply><blockquote><a href="${evLink}">In reply to</a> * `
                    + `<a href="${userLink}">${mxid}</a><br>${html}</blockquote></mx-reply>`;
                const lines = body.trim().split('\n');
                if (lines.length > 0) {
                    lines[0] = `* <${mxid}> ${lines[0]}`;
                    body = lines.map((line) => `> ${line}`).join('\n') + '\n\n';
                }
                break;
            }
            default:
                return null;
        }

        return { body, html };
    }

    public static makeReplyMixIn(ev: MatrixEvent, replyInThread: boolean) {
        if (!ev) return {};

        const replyMixin = {
            'm.relates_to': {
                'm.in_reply_to': {
                    'event_id': ev.getId(),
                },
            },
        };

        /**
         * @experimental
         * Rendering hint for threads, only attached if true to make
         * sure that Element does not start sending that property for all events
         */
        if (replyInThread) {
            const inReplyTo = replyMixin['m.relates_to']['m.in_reply_to'];
            inReplyTo[UNSTABLE_ELEMENT_REPLY_IN_THREAD.name] = replyInThread;
        }

        return replyMixin;
    }

    public static hasThreadReply(event: MatrixEvent) {
        return Boolean(ReplyThread.getParentEventId(event));
    }

    componentDidMount() {
        this.initialize();
        this.trySetExpandableQuotes();
    }

    componentDidUpdate() {
        this.props.onHeightChanged();
        this.trySetExpandableQuotes();
    }

    componentWillUnmount() {
        this.unmounted = true;
    }

    private trySetExpandableQuotes() {
        if (this.props.isQuoteExpanded === undefined && this.blockquoteRef.current) {
            const el: HTMLElement | null = this.blockquoteRef.current.querySelector('.mx_EventTile_body');
            if (el) {
                const code: HTMLElement | null = el.querySelector('code');
                const isCodeEllipsisShown = code ? code.offsetHeight >= SHOW_EXPAND_QUOTE_PIXELS : false;
                const isElipsisShown = el.offsetHeight >= SHOW_EXPAND_QUOTE_PIXELS || isCodeEllipsisShown;
                if (isElipsisShown) {
                    this.props.setQuoteExpanded(false);
                }
            }
        }
    }

    private async initialize(): Promise<void> {
        const { parentEv } = this.props;
        // at time of making this component we checked that props.parentEv has a parentEventId
        const ev = await this.getEvent(ReplyThread.getParentEventId(parentEv));

        if (this.unmounted) return;

        if (ev) {
            const loadedEv = await this.getNextEvent(ev);
            this.setState({
                events: [ev],
                loadedEv,
                loading: false,
            });
        } else {
            this.setState({ err: true });
        }
    }

    private async getNextEvent(ev: MatrixEvent): Promise<MatrixEvent> {
        try {
            const inReplyToEventId = ReplyThread.getParentEventId(ev);
            return await this.getEvent(inReplyToEventId);
        } catch (e) {
            return null;
        }
    }

    private async getEvent(eventId: string): Promise<MatrixEvent> {
        if (!eventId) return null;
        const event = this.room.findEventById(eventId);
        if (event) return event;

        try {
            // ask the client to fetch the event we want using the context API, only interface to do so is to ask
            // for a timeline with that event, but once it is loaded we can use findEventById to look up the ev map
            await this.context.getEventTimeline(this.room.getUnfilteredTimelineSet(), eventId);
        } catch (e) {
            // if it fails catch the error and return early, there's no point trying to find the event in this case.
            // Return null as it is falsey and thus should be treated as an error (as the event cannot be resolved).
            return null;
        }
        return this.room.findEventById(eventId);
    }

    public canCollapse = (): boolean => {
        return this.state.events.length > 1;
    };

    public collapse = (): void => {
        this.initialize();
    };

    private onQuoteClick = async (event: React.MouseEvent<HTMLAnchorElement, MouseEvent>): Promise<void> => {
        const events = [this.state.loadedEv, ...this.state.events];

        let loadedEv = null;
        if (events.length > 0) {
            loadedEv = await this.getNextEvent(events[0]);
        }

        this.setState({
            loadedEv,
            events,
        });

        dis.fire(Action.FocusSendMessageComposer);
    };

    private getReplyThreadColorClass(ev: MatrixEvent): string {
        return getUserNameColorClass(ev.getSender()).replace("Username", "ReplyThread");
    }

    render() {
        let header = null;

        if (this.state.err) {
            header = <blockquote className="mx_ReplyThread mx_ReplyThread_error">
                {
                    _t('Unable to load event that was replied to, ' +
                        'it either does not exist or you do not have permission to view it.')
                }
            </blockquote>;
        } else if (this.state.loadedEv) {
            const ev = this.state.loadedEv;
            const room = this.context.getRoom(ev.getRoomId());
            header = <blockquote className={`mx_ReplyThread ${this.getReplyThreadColorClass(ev)}`}>
                {
                    _t('<a>In reply to</a> <pill>', {}, {
                        'a': (sub) => <a onClick={this.onQuoteClick} className="mx_ReplyThread_show">{ sub }</a>,
                        'pill': (
                            <Pill
                                type={Pill.TYPE_USER_MENTION}
                                room={room}
                                url={makeUserPermalink(ev.getSender())}
                                shouldShowPillAvatar={SettingsStore.getValue("Pill.shouldShowPillAvatar")}
                            />
                        ),
                    })
                }
            </blockquote>;
        } else if (this.props.forExport) {
            const eventId = ReplyThread.getParentEventId(this.props.parentEv);
            header = <p className="mx_ReplyThread_Export">
                { _t("In reply to <a>this message</a>",
                    {},
                    { a: (sub) => (
                        <a className="mx_reply_anchor" href={`#${eventId}`} scroll-to={eventId}> { sub } </a>
                    ),
                    })
                }
            </p>;
        } else if (this.state.loading) {
            header = <Spinner w={16} h={16} />;
        }

        const { isQuoteExpanded } = this.props;
        const evTiles = this.state.events.map((ev) => {
            const classname = classNames({
                'mx_ReplyThread': true,
                [this.getReplyThreadColorClass(ev)]: true,
                // We don't want to add the class if it's undefined, it should only be expanded/collapsed when it's true/false
                'mx_ReplyThread--expanded': isQuoteExpanded === true,
                // We don't want to add the class if it's undefined, it should only be expanded/collapsed when it's true/false
                'mx_ReplyThread--collapsed': isQuoteExpanded === false,
            });
            return (
                <blockquote ref={this.blockquoteRef} className={classname} key={ev.getId()}>
                    <ReplyTile
                        mxEvent={ev}
                        onHeightChanged={this.props.onHeightChanged}
                        permalinkCreator={this.props.permalinkCreator}
                        toggleExpandedQuote={() => this.props.setQuoteExpanded(!this.props.isQuoteExpanded)}
                    />
                </blockquote>
            );
        });

        return <div className="mx_ReplyThread_wrapper">
            <div>{ header }</div>
            <div>{ evTiles }</div>
        </div>;
    }
}
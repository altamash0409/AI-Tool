<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Architecture
- Keep the converter adapter and typed sample fixtures in a browser-safe module separate from the UI so a real conversion service can replace the demo without changing editor controls.
- Use a textarea with a synchronized token-highlighted layer for editable code to avoid introducing a heavy editor dependency.
- Invalidate output whenever source or conversion settings change, and only match exact bundled sample inputs so demo templates can never masquerade as custom conversions.

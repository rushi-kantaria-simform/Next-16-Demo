"use client";

import styles from "./size-guide.module.css";

/**
 * Specification table — the payload for the `next/dynamic` demo.
 *
 * It is a Client Component that most visitors never open, which is exactly the
 * profile worth code-splitting: shipping it in the main bundle makes every
 * visitor download markup for a panel they will not expand.
 *
 * Styling is deliberately mixed: Tailwind utilities for layout, a CSS Module
 * for the table's structural selectors and container query. Both read from the
 * same `@theme` tokens.
 */
export function SizeGuide() {
  return (
    <div className={styles.wrapper}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>Spec</th>
            <th>Value</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Warranty</td>
            <td>2 years, parts and labour</td>
          </tr>
          <tr>
            <td>Returns</td>
            <td>30 days, unopened</td>
          </tr>
          <tr>
            <td>Shipping</td>
            <td>Free over $50</td>
          </tr>
          <tr>
            <td>Support</td>
            <td>Email and chat, 7 days</td>
          </tr>
        </tbody>
      </table>

      <p className={styles.note}>
        Padding and type scale here respond to the <em>container</em> width via
        an <code>@container</code> query, not the viewport — so this table reads
        correctly in a narrow modal and a wide page without a media query.
      </p>
    </div>
  );
}

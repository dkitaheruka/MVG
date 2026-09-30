package com.getfocused.matabishi.repository;

import com.getfocused.matabishi.model.Article;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface ArticleRepository extends JpaRepository<Article, Long> {
    List<Article> findByCategorieId(Long categorieId);
    List<Article> findByType(String type);
}